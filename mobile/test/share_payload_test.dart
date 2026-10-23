import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/share_payload.dart';

void main() {
  final origin = Uri.parse('https://ladies-firstv2.onrender.com/');
  test('shares a store product link without exposing native files', () {
    final p = StoreSharePayload.parse(jsonEncode({
      'text': 'My pick',
      'url': 'https://ladies-firstv2.onrender.com/share/product/4',
    }), origin);
    expect(p.url.path, '/share/product/4');
    expect(p.image, isNull);
  });
  test('accepts a generated PNG and rejects other origins, local paths and fake images', () {
    final p = StoreSharePayload.parse(jsonEncode({
      'text': 'Story',
      'url': origin.toString(),
      'imageData': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XcAAAAASUVORK5CYII=',
    }), origin);
    expect(p.image, isNotNull);
    for (final url in ['file:///private/data', 'https://evil.test/',
      'https://ladies-firstv2.onrender.com.evil.test/',
      'https://ladies-firstv2.onrender.com/admin.html']) {
      expect(() => StoreSharePayload.parse(jsonEncode({'text': 'x', 'url': url}), origin), throwsFormatException);
    }
    expect(() => StoreSharePayload.parse(jsonEncode({
      'text': 'x', 'url': origin.toString(),
      'imageData': 'data:image/png;base64,YmFk',
    }), origin), throwsFormatException);
    expect(() => StoreSharePayload.parse('[]', origin), throwsFormatException);
  });
}
