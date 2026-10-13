import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/main.dart';

void main() {
  test('Flutter uses the real Ladies First storefront', () {
    expect(storeUrl, startsWith('https://'));
    expect(Uri.parse(storeUrl).host, 'ladies-firstv2.onrender.com');
  });
}
