import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first_admin/main.dart';

void main() {
  test('admin app uses the Ladies First Admin identity', () {
    expect(LadiesFirstAdmin.appTitle, 'Ladies First Admin');
  });
}
