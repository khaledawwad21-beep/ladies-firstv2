import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/main.dart';

void main() {
  test('official app icon source uses Ladies First butterfly mark', () {
    final iconFile = File('branding/ladies-first-app-icon.svg');
    expect(iconFile.existsSync(), isTrue);
    final source = iconFile.readAsStringSync();
    expect(source, contains('Ladies First'));
    expect(source, contains('viewBox="0 0 1024 1024"'));
    expect(source, contains('butterfly'));
  });

  test('Flutter uses the real Ladies First storefront', () {
    expect(storeUrl, startsWith('https://'));
    expect(Uri.parse(storeUrl).host, 'ladies-firstv2.onrender.com');
  });
}
