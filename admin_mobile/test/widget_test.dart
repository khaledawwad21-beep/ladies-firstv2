import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first_admin/main.dart';

void main() {
  test('admin app has its own application identity', () {
    expect(const LadiesFirstAdmin().title, 'Ladies First Admin');
  });
}
