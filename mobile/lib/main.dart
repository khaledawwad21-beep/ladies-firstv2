import 'dart:async';
import 'package:share_plus/share_plus.dart';
import 'share_payload.dart';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Canonical production URL from the Ladies First storefront.
const String storeUrl = String.fromEnvironment(
  'STORE_URL',
  defaultValue: 'https://ladies-firstv2.onrender.com/',
);

const Color plum = Color(0xFF5B3154);
const Color cream = Color(0xFFFBF4EC);


// Runs only on the store origin after its scripts have loaded. Avoid
// MutationObservers and repeated DOM scans on every animation frame.
const String mobileStoreEnhancements = r'''
(() => {
  if (location.hostname !== 'ladies-firstv2.onrender.com') return;
  if (window.__lfFlutterEnhancementsInstalled) return;
  window.__lfFlutterEnhancementsInstalled = true;

  const style = document.createElement('style');
  style.id = 'lf-flutter-mobile-style';
  style.textContent = [
    '#whatsappFloat { display:none!important; }',
    '@media(max-width:760px){',
    '  .bottomNav { bottom:0!important; }',
    '  .naya-launcher { width:58px!important; height:58px!important;',
    '    right:12px!important; bottom:calc(82px + env(safe-area-inset-bottom,0px))!important;',
    '    box-shadow:0 4px 12px #40234c33!important; }',
    '  header,.heroText,.bottomNav { backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }',
    '}',
    '#lfMobileGender { display:flex; align-items:center; gap:7px; flex-wrap:wrap;',
    '  padding:10px 3px 2px; direction:rtl; color:#63345e; font-size:13px; }',
    '#lfMobileGender button { border:1px solid #dfc8d6; border-radius:13px;',
    '  background:#fff; padding:6px 11px; color:#63345e; font:inherit; cursor:pointer; }',
    '#lfMobileGender button[aria-pressed="true"] { background:#63345e; color:#fff; }',
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);

  // Selection is scoped to the signed-in account, not inferred from the
  // person's name, and does not change the server-side profile.
  function normalGender(value) {
    const v = String(value || '').trim().toLowerCase();
    if (['male', 'm', 'ذكر', 'man'].includes(v)) return 'male';
    if (['female', 'f', 'أنثى', 'انثى', 'woman'].includes(v)) return 'female';
    return '';
  }
  const realGetAccount = typeof window.getAccount === 'function'
    ? window.getAccount : null;
  if (!realGetAccount) return;

  function prefKey(a) {
    const id = a && (a.serverUserId || a.user_id || a.id ||
      (a.type && a.contact ? a.type + ':' + a.contact : ''));
    return id ? 'lf_app_gender:' + String(id) : '';
  }
  function chosenGender(a) {
    const key = prefKey(a);
    const setting = key ? normalGender(localStorage.getItem(key)) : '';
    return setting || normalGender(a && a.gender);
  }

  window.getAccount = function() {
    const a = realGetAccount();
    if (!a) return a;
    const gender = chosenGender(a);
    return gender ? { ...a, gender } : a;
  };
  window.greetingForAccount = function(a) {
    const gender = chosenGender(a);
    return gender === 'male' ? 'نورتنا' :
      gender === 'female' ? 'نورتينا' : 'أهلاً وسهلاً';
  };

  function applyCustomerCopy() {
    const a = window.getAccount();
    const gender = a ? chosenGender(a) : '';
    const en = document.documentElement.lang === 'en';
    if (en || !gender) return;
    const headerSearch = document.getElementById('headerSearchText');
    if (headerSearch) headerSearch.textContent =
      gender === 'male' ? 'ابحث عن قطعة مميزة' : 'ابحثي عن قطعة مميزة';
    const nayaWelcome = document.getElementById('nayaWelcome');
    if (nayaWelcome && nayaWelcome.textContent &&
      document.getElementById('nayaAssistant')?.classList.contains('open')) {
      nayaWelcome.textContent = gender === 'male'
        ? 'يا أهلا فيك 🌸 أنا نايا، شو بقدر ساعدك اليوم؟'
        : 'يا أهلا فيكي 🌸 أنا نايا، شو بقدر ساعدك اليوم؟';
    }
  }

  function insertGenderChoice() {
    const slot = document.getElementById('sideAccountGreeting');
    const account = realGetAccount();
    if (!slot || !account) return;
    if (document.getElementById('lfMobileGender')) return;
    const row = document.createElement('div');
    row.id = 'lfMobileGender';
    const text = document.createElement('span');
    text.textContent = 'صيغة مخاطبتك:';
    row.appendChild(text);

    const gender = chosenGender(account);
    for (const entry of [['male', 'مذكر'], ['female', 'مؤنث']]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = entry[1];
      btn.dataset.gender = entry[0];
      btn.setAttribute('aria-pressed', String(entry[0] === gender));
      btn.addEventListener('click', () => {
        const key = prefKey(realGetAccount());
        if (!key) return;
        localStorage.setItem(key, entry[0]);
        if (typeof window.renderSideAccountGreeting === 'function') {
          window.renderSideAccountGreeting();
        }
        if (typeof window.updateAccountBadge === 'function') {
          window.updateAccountBadge();
        }
        if (document.getElementById('accountModal')?.style.display === 'flex'
          && typeof window.renderAccountContent === 'function') {
          window.renderAccountContent();
        }
        applyCustomerCopy();
      });
      row.appendChild(btn);
    }
    slot.appendChild(row);
  }

  if (typeof window.renderSideAccountGreeting === 'function') {
    const original = window.renderSideAccountGreeting;
    window.renderSideAccountGreeting = function(...args) {
      const result = original.apply(this, args);
      insertGenderChoice();
      applyCustomerCopy();
      return result;
    };
  }
  for (const name of ['renderNewUiLang', 'renderStaticLang']) {
    if (typeof window[name] === 'function') {
      const original = window[name];
      window[name] = function(...args) {
        const result = original.apply(this, args);
        applyCustomerCopy();
        return result;
      };
    }
  }
  // No continuous layout observer: re-render only at known app events.
  if (typeof window.renderSideAccountGreeting === 'function') {
    window.renderSideAccountGreeting();
  }
  if (typeof window.updateAccountBadge === 'function') {
    window.updateAccountBadge();
  }
  applyCustomerCopy();
})();
''';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: plum,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: cream,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const LadiesFirstApp());
}

class LadiesFirstApp extends StatelessWidget {
  const LadiesFirstApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ladies First',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: plum),
        scaffoldBackgroundColor: cream,
      ),
      home: const StoreScreen(),
    );
  }
}

class StoreScreen extends StatefulWidget {
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

enum _StoreLoadIssue { none, network, timeout }

class _StoreScreenState extends State<StoreScreen> {
  late final WebViewController _webView;
  late final Widget _webContent;
  Timer? _loadTimeout;
  int _navigationId = 0;
  bool _loading = true;
  bool _loadedOnce = false;
  _StoreLoadIssue _loadIssue = _StoreLoadIssue.none;
  int _progress = 0;
  bool _sharing = false;

  void _armLoadTimeout() {
    _loadTimeout?.cancel();
    final int current = ++_navigationId;
    _loadTimeout = Timer(const Duration(seconds: 60), () {
      if (!mounted || current != _navigationId || !_loading) return;
      setState(() {
        _loading = false;
        _loadIssue = _StoreLoadIssue.timeout;
      });
    });
  }

  Future<void> _checkStorePage(int navigationId) async {
    // Render may finish a warm-up document before the real store arrives.
    // Probe the document without reloading or resetting the customer session.
    while (mounted && navigationId == _navigationId) {
      try {
        final Object result = await _webView.runJavaScriptReturningResult(
          "!!(document.getElementById('sideMenuOverlay') && document.getElementById('bottomWhatsLink') && document.getElementById('grid') && document.querySelector('#grid > *'))",
        );
        if (!mounted || navigationId != _navigationId) return;
        if (result == true || result.toString() == 'true') {
          await _applyMobileEnhancements();
          if (!mounted || navigationId != _navigationId) return;
          _finishLoad();
          return;
        }
      } catch (_) {
        // The bridge can be briefly unavailable during a server redirect.
      }
      if (!_loading || _loadIssue == _StoreLoadIssue.network) return;
      await Future<void>.delayed(const Duration(milliseconds: 500));
    }
  }

  void _finishLoad() {
    _loadTimeout?.cancel();
    setState(() {
      _loading = false;
      _loadedOnce = true;
      _progress = 100;
      _loadIssue = _StoreLoadIssue.none;
    });
  }

  @override
  void initState() {
    super.initState();
    _webView = WebViewController(
      onPermissionRequest: (request) => unawaited(_requestMicrophone(request)),
    )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'LFNativeShare',
        onMessageReceived: (message) => unawaited(_shareFromStore(message.message)),
      )
      ..setBackgroundColor(cream)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (!mounted || progress - _progress < 10 && progress != 100) return;
            setState(() => _progress = progress);
          },
          onPageStarted: (String _) {
            if (!mounted) return;
            setState(() {
              _loading = true;
              _progress = 0;
              _loadIssue = _StoreLoadIssue.none;
            });
            _armLoadTimeout();
          },
          onPageFinished: (String url) {
            if (!mounted || _loadIssue == _StoreLoadIssue.network) return;
            final uri = Uri.tryParse(url);
            if (uri != null && uri.host == Uri.parse(storeUrl).host &&
                (uri.path == '/' || uri.path == '/index.html' || uri.path.isEmpty)) {
              unawaited(_checkStorePage(_navigationId));
            } else {
              // Receipts and other store pages do not contain the home menu.
              _finishLoad();
            }
          },
          onWebResourceError: (WebResourceError error) {
            // Missing images and blocked third-party requests are not a
            // reason to replace the full storefront with an offline screen.
            if (error.isForMainFrame != true || !mounted) return;
            _loadTimeout?.cancel();
            setState(() {
              _loadIssue = _StoreLoadIssue.network;
              _loading = false;
            });
          },
          onNavigationRequest: (NavigationRequest request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;
            final externalHost = uri.host == 'wa.me' ||
                uri.host == 'api.whatsapp.com' ||
                uri.host == 'web.whatsapp.com';
            final externalScheme = uri.scheme == 'tel' ||
                uri.scheme == 'sms' ||
                uri.scheme == 'mailto' ||
                uri.scheme == 'whatsapp';
            if (externalHost || externalScheme) {
              unawaited(_openOutside(uri));
              return NavigationDecision.prevent;
            }
            // Keep the original checkout, account, products, and Naya pages
            // on the same origin so their browser session is preserved.
            if ((uri.scheme == 'http' || uri.scheme == 'https') &&
                uri.host != Uri.parse(storeUrl).host && request.isMainFrame) {
              unawaited(_openOutside(uri));
              return NavigationDecision.prevent;
            }
            if (uri.scheme == 'http' ||
                uri.scheme == 'https' ||
                uri.scheme == 'about' ||
                uri.scheme == 'blob') {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      );
    _webContent = WebViewWidget(controller: _webView);
    _armLoadTimeout();
    unawaited(_webView.loadRequest(Uri.parse(storeUrl)).catchError((Object _) {
      if (!mounted) return;
      _loadTimeout?.cancel();
      setState(() {
        _loadIssue = _StoreLoadIssue.network;
        _loading = false;
      });
    }));
  }

  Future<void> _shareFromStore(String message) async {
    if (_sharing || !mounted) return;
    _sharing = true;
    try {
      final current = Uri.tryParse(await _webView.currentUrl() ?? '');
      final expected = Uri.parse(storeUrl);
      if (current?.origin != expected.origin) return;
      final payload = StoreSharePayload.parse(message, expected);
      if (!mounted) return;
      final box = context.findRenderObject() as RenderBox?;
      final origin = box != null && box.hasSize
          ? box.localToGlobal(Offset.zero) & box.size
          : null;
      await SharePlus.instance.share(ShareParams(
        title: 'Ladies First',
        text: '${payload.text}\n${payload.url}',
        files: payload.image == null
            ? null
            : [XFile.fromData(payload.image!, mimeType: 'image/png')],
        fileNameOverrides: payload.image == null ? null : ['Ladies-First-Story.png'],
        sharePositionOrigin: origin,
      ));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذّرت المشاركة. جرّبي نسخ الرابط من المتجر.')),
        );
      }
    } finally {
      _sharing = false;
    }
  }

  Future<void> _requestMicrophone(WebViewPermissionRequest request) async {
    final navigation = _navigationId;
    try {
      final current = Uri.tryParse(await _webView.currentUrl() ?? '');
      final onlyMicrophone = request.types.length == 1 &&
          request.types.contains(WebViewPermissionResourceType.microphone);
      if (!mounted || !onlyMicrophone || current?.origin != Uri.parse(storeUrl).origin) {
        await request.deny();
        return;
      }
      // This callback runs only after the customer taps the voice control.
      final permission = await Permission.microphone.request();
      if (mounted && permission.isGranted && navigation == _navigationId) {
        await request.grant();
      } else {
        await request.deny();
      }
    } catch (_) {
      await request.deny();
    }
  }

  Future<void> _applyMobileEnhancements() async {
    try {
      await _webView.runJavaScript(mobileStoreEnhancements);
    } catch (_) {
      // Keep the store usable even if a third-party page blocks JavaScript.
    }
  }

  Future<void> _openOutside(Uri uri) async {
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened) throw StateError('No application can open this link');
    } catch (_) {
      // An external application may not be installed.
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذّر فتح الرابط على هذا الجهاز')),
      );
    }
  }

  Future<void> _navigateBack() async {
    if (await _webView.canGoBack()) {
      await _webView.goBack();
    } else if (Platform.isAndroid) {
      await SystemNavigator.pop();
    }
  }

  Future<void> _reload() async {
    if (!mounted) return;
    setState(() {
      _loadIssue = _StoreLoadIssue.none;
      _loading = true;
      _progress = 0;
    });
    _armLoadTimeout();
    try {
      // Reload the same origin to retain customer login and cart data.
      await _webView.reload();
    } catch (_) {
      if (!mounted) return;
      _loadTimeout?.cancel();
      setState(() {
        _loadIssue = _StoreLoadIssue.network;
        _loading = false;
      });
    }
  }

  Future<void> _openStoreInBrowser() async {
    try {
      final opened = await launchUrl(
        Uri.parse(storeUrl),
        mode: LaunchMode.externalApplication,
      );
      if (opened) return;
    } catch (_) {
      // Report the failure below.
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('تعذّر فتح المتجر في المتصفح')),
    );
  }

  @override
  void dispose() {
    _loadTimeout?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) unawaited(_navigateBack());
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: <Widget>[
              _webContent,
              if (_loading && !_loadedOnce && _loadIssue == _StoreLoadIssue.none)
                const Positioned.fill(
                  child: ColoredBox(
                    color: cream,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Image(image: AssetImage('assets/brand-mark.png'), width: 144, height: 144, semanticLabel: 'Ladies First'),
                          SizedBox(height: 16),
                          Text(
                            'Ladies First',
                            style: TextStyle(
                              color: plum,
                              fontSize: 29,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 18),
                          CircularProgressIndicator(color: plum),
                          SizedBox(height: 18),
                          Text(
                            'جارٍ فتح المتجر...',
                            textDirection: TextDirection.rtl,
                            style: TextStyle(color: plum, fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              if (_loading && _loadIssue == _StoreLoadIssue.none)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    value: _progress < 10 ? null : _progress / 100,
                    minHeight: 2,
                    color: plum,
                    backgroundColor: cream,
                  ),
                ),
              if (_loadIssue != _StoreLoadIssue.none)
                Positioned.fill(
                  child: ColoredBox(
                    color: cream,
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            const Icon(
                              Icons.cloud_off_rounded,
                              size: 54,
                              color: plum,
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'المتجر ما فتح بالشكل الصحيح',
                              textDirection: TextDirection.rtl,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: plum,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _loadIssue == _StoreLoadIssue.timeout
                                  ? 'التحميل أخذ وقت أطول من المعتاد. جرّب إعادة المحاولة.'
                                  : 'تحقّق من اتصال الإنترنت ثم أعد المحاولة.',
                              textDirection: TextDirection.rtl,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 18),
                            FilledButton.icon(
                              onPressed: _reload,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('إعادة المحاولة'),
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: _openStoreInBrowser,
                              icon: const Icon(Icons.open_in_browser),
                              label: const Text('فتح المتجر في المتصفح'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
