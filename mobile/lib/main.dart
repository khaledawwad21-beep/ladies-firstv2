import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Canonical production URL from the Ladies First storefront.
const String storeUrl = String.fromEnvironment(
  'STORE_URL',
  defaultValue: 'https://ladies-firstv2.onrender.com/',
);

const Color plum = Color(0xFF5B3154);
const Color cream = Color(0xFFFBF4EC);

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

class _StoreScreenState extends State<StoreScreen> {
  late final WebViewController _webView;
  bool _loading = true;
  bool _hasMainFrameError = false;
  int _progress = 0;

  @override
  void initState() {
    super.initState();
    _webView = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(cream)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (!mounted) return;
            setState(() => _progress = progress);
          },
          onPageStarted: (String _) {
            if (!mounted) return;
            setState(() {
              _loading = true;
              _hasMainFrameError = false;
            });
          },
          onPageFinished: (String _) {
            if (!mounted) return;
            setState(() {
              _loading = false;
              _progress = 100;
            });
          },
          onWebResourceError: (WebResourceError error) {
            // Missing images and blocked third-party requests are not a
            // reason to replace the full storefront with an offline screen.
            if (error.isForMainFrame == false || !mounted) return;
            setState(() {
              _hasMainFrameError = true;
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
    unawaited(_webView.loadRequest(Uri.parse(storeUrl)));
  }

  Future<void> _openOutside(Uri uri) async {
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
    if (mounted) {
      setState(() {
        _hasMainFrameError = false;
        _loading = true;
      });
    }
    await _webView.reload();
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
              WebViewWidget(controller: _webView),
              if (_loading && !_hasMainFrameError)
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
              if (_hasMainFrameError)
                Positioned.fill(
                  child: ColoredBox(
                    color: cream,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            const Icon(
                              Icons.wifi_off_rounded,
                              size: 54,
                              color: plum,
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'تعذّر الاتصال بالمتجر',
                              textDirection: TextDirection.rtl,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: plum,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'تأكدي من الإنترنت وحاولي مرة ثانية.',
                              textDirection: TextDirection.rtl,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 18),
                            FilledButton.icon(
                              onPressed: _reload,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('إعادة المحاولة'),
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
