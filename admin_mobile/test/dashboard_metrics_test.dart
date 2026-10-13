import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first_admin/main.dart';

void main() {
  group('DashboardMetrics', () {
    test('parses all values returned by the admin API', () {
      final metrics = DashboardMetrics.fromJson({
        'customers': 15,
        'products': '8',
        'orders': 32,
        'sales': '1250.75',
        'pendingOrders': 4,
        'lowStock': 2,
      });

      expect(metrics.customers, 15);
      expect(metrics.products, 8);
      expect(metrics.orders, 32);
      expect(metrics.sales, 1250.75);
      expect(metrics.pendingOrders, 4);
      expect(metrics.lowStock, 2);
    });

    test('uses safe zero defaults for empty API fields', () {
      final metrics = DashboardMetrics.fromJson(const {});

      expect(metrics.customers, 0);
      expect(metrics.products, 0);
      expect(metrics.orders, 0);
      expect(metrics.sales, 0);
      expect(metrics.pendingOrders, 0);
      expect(metrics.lowStock, 0);
    });
  });
}
