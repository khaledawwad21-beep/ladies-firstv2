import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/push_notifications.dart';
void main() {
  final store = Uri.parse('https://ladies-firstv2.onrender.com/');
  test('notification opens the selected product on the store origin', () {
    expect(pushTarget('/?product=12', store)?.query, 'product=12');
  });
  test('notifications cannot navigate to another origin or scheme', () {
    for (final path in ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/\n']) {
      expect(pushTarget(path, store), isNull);
    }
  });
}
