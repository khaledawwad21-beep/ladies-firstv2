import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/main.dart';

void main() {
  test('Store uses the official encrypted website address', () {
    final uri = Uri.parse(storeUrl);
    expect(uri.scheme, 'https');
    expect(uri.host, 'ladies-firstv2.onrender.com');
  });

  test('Store URL has a valid absolute origin', () {
    expect(Uri.parse(storeUrl).hasAuthority, isTrue);
  });

  test('Admin app targets the protected admin login page on the store origin', () {
    final uri = Uri.parse(adminUrl);
    expect(uri.scheme, 'https');
    expect(uri.origin, Uri.parse(storeUrl).origin);
    expect(uri.path, '/admin-login.html');
  });

  test('Build mode selects the matching app entry point', () {
    expect(appMode, anyOf('store', 'admin'));
    expect(appStartUrl, isAdminMode ? adminUrl : storeUrl);
  });
}
