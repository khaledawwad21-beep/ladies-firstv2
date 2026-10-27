import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

Uri? pushTarget(String path, Uri store) {
  if (!path.startsWith('/') || path.startsWith('//') || path.contains('\\') ||
      RegExp(r'[\x00-\x20]').hasMatch(path)) return null;
  try {
    final target = store.resolve(path);
    return target.origin == store.origin && target.scheme == 'https' ? target : null;
  } catch (_) { return null; }
}

/// Account credentials never leave the WebView. This bridge only returns the
/// device token after permission; the authenticated web page registers it.
class StorePushNotifications {
  StorePushNotifications({required this.store, required this.onDevice,
    required this.onOpen, required this.onForeground});
  final Uri store;
  final Future<void> Function(Map<String, String>) onDevice;
  final void Function(Uri) onOpen;
  final void Function(String, Uri?) onForeground;
  Future<void>? _initializing;
  FirebaseMessaging? _messaging;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  bool _disposed = false;
  String get _platform => Platform.isIOS ? 'ios' : 'android';

  Future<void> start() => _initializing ??= _start();
  Future<void> _start() async {
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
    try {
      final request = await client.getUrl(store.resolve('/api/push/config'));
      final response = await request.close().timeout(const Duration(seconds: 12));
      if (response.statusCode != 200) return;
      final data = jsonDecode(await response.transform(utf8.decoder).join()) as Map<String, dynamic>;
      final config = data['firebase'] as Map<String, dynamic>? ?? {};
      final appId = config[Platform.isIOS ? 'appIdIos' : 'appIdAndroid'];
      if (data['configured'] != true || appId is! String || appId.isEmpty || _disposed) return;
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: FirebaseOptions(
          apiKey: config['apiKey'] as String,
          appId: appId,
          messagingSenderId: config['messagingSenderId'] as String,
          projectId: config['projectId'] as String,
          iosBundleId: config['iosBundleId'] as String?,
        ));
      }
      if (_disposed) return;
      final messaging = FirebaseMessaging.instance;
      _messaging = messaging;
      await messaging.setAutoInitEnabled(false);
      _subscriptions.add(messaging.onTokenRefresh.listen((value) {
        if (!_disposed) unawaited(_deliver(value));
      }));
      _subscriptions.add(FirebaseMessaging.onMessageOpenedApp.listen(_open));
      _subscriptions.add(FirebaseMessaging.onMessage.listen((message) {
        if (!_disposed) onForeground(message.notification?.title ?? 'Ladies First',
          pushTarget(message.data['path'] ?? '/', store));
      }));
      final initial = await messaging.getInitialMessage();
      if (initial != null && !_disposed) _open(initial);
    } catch (_) {
      // Missing Firebase configuration must not prevent shopping or sign-in.
    } finally { client.close(force: true); }
  }

  void _open(RemoteMessage message) {
    final target = pushTarget(message.data['path'] ?? '/', store);
    if (target != null && !_disposed) onOpen(target);
  }
  Future<void> _deliver(String token) async {
    if (!_disposed) await onDevice({'token': token, 'platform': _platform,
      'permission': 'authorized'});
  }
  Future<void> handle(String raw) async {
    if (_disposed) return;
    try {
      final command = jsonDecode(raw) as Map<String, dynamic>;
      if (!['enable', 'restore'].contains(command['action'])) return;
      await start();
      final messaging = _messaging;
      if (messaging == null) {
        await onDevice({'platform': _platform,
          'error': 'إعداد خدمة الإشعارات غير مكتمل؛ يمكنك متابعة التسوق.'});
        return;
      }
      final settings = command['action'] == 'enable'
        ? await messaging.requestPermission(alert: true, badge: true, sound: true)
        : await messaging.getNotificationSettings();
      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        await onDevice({'platform': _platform, 'permission': 'denied'});return;
      }
      await messaging.setAutoInitEnabled(true);
      final token = await messaging.getToken();
      if (token != null) await _deliver(token);
    } catch (_) {
      if (!_disposed) await onDevice({'platform': _platform,
        'error': 'تعذر تفعيل الإشعارات؛ أعد المحاولة من إعدادات الحساب.'});
    }
  }
  void dispose() {
    _disposed = true;
    for (final subscription in _subscriptions) { unawaited(subscription.cancel()); }
  }
}
