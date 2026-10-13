import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

const _base = 'https://ladies-firstv2.onrender.com/api';
const _plum = Color(0xFF5B3154);
const _tokenKey = 'lf_admin_token';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LadiesFirstAdmin());
}

class LadiesFirstAdmin extends StatelessWidget {
  const LadiesFirstAdmin({super.key});

  static const appTitle = 'Ladies First Admin';

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: appTitle,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: _plum),
          scaffoldBackgroundColor: const Color(0xFFFBF4EC),
        ),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        ),
        home: const SessionGate(),
      );
}

class AdminApi {
  AdminApi({http.Client? client})
      : _client = client ?? http.Client(),
        _storage = FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<Map<String, dynamic>> request(
    String path, {
    String method = 'GET',
    Map<String, Object?>? body,
  }) async {
    final token = await readToken();
    final headers = <String, String>{'Accept': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    if (body != null) headers['Content-Type'] = 'application/json';
    final uri = Uri.parse('$_base$path');
    late http.Response response;
    final encodedBody = body == null ? null : jsonEncode(body);
    if (method == 'POST') {
      response = await _client
          .post(uri, headers: headers, body: encodedBody ?? '{}')
          .timeout(const Duration(seconds: 30));
    } else if (method == 'PATCH') {
      response = await _client
          .patch(uri, headers: headers, body: encodedBody ?? '{}')
          .timeout(const Duration(seconds: 30));
    } else {
      response = await _client
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 30));
    }
    final decoded = jsonDecode(response.body);
    final data = Map<String, dynamic>.from(decoded as Map);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AdminError(
        data['message']?.toString() ?? 'تعذر الاتصال بالخادم.',
        status: response.statusCode,
      );
    }
    return data;
  }

  Future<Map<String, dynamic>> login(String contact, String password) async {
    final result = await request(
      '/auth/login',
      method: 'POST',
      body: {'contact': contact.trim(), 'password': password},
    );
    final user = Map<String, dynamic>.from(result['user'] as Map? ?? const {});
    final role = user['role']?.toString();
    if (result['ok'] != true ||
        !['owner', 'admin', 'staff'].contains(role)) {
      throw const AdminError('هذا الحساب لا يملك صلاحية إدارة المتجر.');
    }
    final token = result['token']?.toString();
    if (token == null || token.isEmpty) {
      throw const AdminError('تعذر إنشاء جلسة آمنة.');
    }
    await _storage.write(key: _tokenKey, value: token);
    return user;
  }

  Future<void> logout() async {
    try {
      await request('/auth/logout', method: 'POST');
    } catch (_) {}
    await _storage.delete(key: _tokenKey);
  }
}

class AdminError implements Exception {
  const AdminError(this.message, {this.status});

  final String message;
  final int? status;

  @override
  String toString() => message;
}

class DashboardMetrics {
  const DashboardMetrics({
    required this.customers,
    required this.products,
    required this.orders,
    required this.sales,
    required this.pendingOrders,
    required this.lowStock,
  });

  final int customers;
  final int products;
  final int orders;
  final double sales;
  final int pendingOrders;
  final int lowStock;

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    int count(String key) => int.tryParse('${json[key] ?? 0}') ?? 0;
    double amount(String key) => double.tryParse('${json[key] ?? 0}') ?? 0;
    return DashboardMetrics(
      customers: count('customers'),
      products: count('products'),
      orders: count('orders'),
      sales: amount('sales'),
      pendingOrders: count('pendingOrders'),
      lowStock: count('lowStock'),
    );
  }
}

class SessionGate extends StatefulWidget {
  const SessionGate({super.key});

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  final _api = AdminApi();
  bool _loading = true;
  bool _signedIn = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final token = await _api.readToken();
    if (mounted) {
      setState(() {
        _signedIn = token != null && token.isNotEmpty;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!_signedIn) {
      return LoginPage(
        api: _api,
        onSuccess: () => setState(() => _signedIn = true),
      );
    }
    return AdminShell(
      api: _api,
      onLogout: () => setState(() => _signedIn = false),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({required this.api, required this.onSuccess, super.key});

  final AdminApi api;
  final VoidCallback onSuccess;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _contact = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _contact.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.login(_contact.text, _password.text);
      widget.onSuccess();
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Card(
                  color: Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.local_florist, color: _plum, size: 48),
                          const SizedBox(height: 8),
                          const Text('Ladies First',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: _plum,
                                  fontSize: 25,
                                  fontWeight: FontWeight.bold)),
                          const Text('لوحة إدارة المتجر',
                              textAlign: TextAlign.center),
                          const SizedBox(height: 24),
                          TextFormField(
                            controller: _contact,
                            decoration: const InputDecoration(
                              labelText: 'البريد الإلكتروني أو رقم الهاتف',
                              prefixIcon: Icon(Icons.person_outline),
                              border: OutlineInputBorder(),
                            ),
                            validator: (v) =>
                                v == null || v.trim().isEmpty ? 'أدخلي بيانات الدخول' : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _password,
                            obscureText: true,
                            onFieldSubmitted: (_) => _login(),
                            decoration: const InputDecoration(
                              labelText: 'كلمة المرور',
                              prefixIcon: Icon(Icons.lock_outline),
                              border: OutlineInputBorder(),
                            ),
                            validator: (v) =>
                                v == null || v.isEmpty ? 'أدخلي كلمة المرور' : null,
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(_error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.red)),
                          ],
                          const SizedBox(height: 18),
                          FilledButton(
                            onPressed: _busy ? null : _login,
                            child: _busy
                                ? const SizedBox(
                                    height: 22,
                                    width: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Text('تسجيل الدخول'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

class AdminShell extends StatefulWidget {
  const AdminShell({required this.api, required this.onLogout, super.key});

  final AdminApi api;
  final VoidCallback onLogout;

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _index = 0;
  static const _tabs = [
    ('الرئيسية', Icons.dashboard_outlined),
    ('الطلبات', Icons.receipt_long_outlined),
    ('المنتجات', Icons.shopping_bag_outlined),
    ('المخزون', Icons.warehouse_outlined),
    ('المزيد', Icons.grid_view_rounded),
  ];

  Future<void> _logout() async {
    await widget.api.logout();
    widget.onLogout();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(_tabs[_index].$1,
              style: const TextStyle(fontWeight: FontWeight.bold)),
          actions: [
            IconButton(
              tooltip: 'تسجيل الخروج',
              onPressed: _logout,
              icon: const Icon(Icons.logout),
            )
          ],
        ),
        body: _index == 0
            ? DashboardPage(api: widget.api)
            : _index == 1
                ? OrdersPage(api: widget.api)
                : _index == 4
                    ? const MoreSections()
                    : _ComingSoon(title: _tabs[_index].$1),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: _tabs
              .map((item) =>
                  NavigationDestination(icon: Icon(item.$2), label: item.$1))
              .toList(),
        ),
      );
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({required this.api, super.key});

  final AdminApi api;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late Future<DashboardMetrics> _data;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<DashboardMetrics> _load() async {
    final response = await widget.api.request('/admin/dashboard');
    return DashboardMetrics.fromJson(
      Map<String, dynamic>.from(response['dashboard'] as Map? ?? const {}),
    );
  }

  Future<void> _refresh() async {
    setState(() => _data = _load());
    try {
      await _data;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('ملخص المتجر',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('اسحبي للأسفل لتحديث الأرقام'),
            const SizedBox(height: 16),
            FutureBuilder<DashboardMetrics>(
              future: _data,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return _ErrorPanel(
                    message: snapshot.error.toString(),
                    retry: _refresh,
                  );
                }
                if (!snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final d = snapshot.data!;
                final cards = [
                  ('الطلبات', '${d.orders}', Icons.receipt_long),
                  ('قيد التنفيذ', '${d.pendingOrders}', Icons.pending_actions),
                  ('المنتجات', '${d.products}', Icons.shopping_bag),
                  ('مخزون منخفض', '${d.lowStock}', Icons.warning_amber),
                  ('العملاء', '${d.customers}', Icons.people_outline),
                  ('المبيعات', d.sales.toStringAsFixed(2), Icons.payments_outlined),
                ];
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.35,
                  children: cards
                      .map((c) => Card(
                            color: Colors.white,
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Icon(c.$3, color: _plum),
                                  Text(c.$2,
                                      style: const TextStyle(
                                          fontSize: 23,
                                          fontWeight: FontWeight.bold)),
                                  Text(c.$1),
                                ],
                              ),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 16),
            const Text('أقسام لوحة التحكم',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text('الطلبات')),
                Chip(label: Text('المنتجات والمخزون')),
                Chip(label: Text('التقارير')),
                Chip(label: Text('العملاء والموظفون')),
                Chip(label: Text('الكوبونات')),
                Chip(label: Text('إعدادات المتجر')),
              ],
            ),
          ],
        ),
      );
}

class OrdersPage extends StatefulWidget {
  const OrdersPage({required this.api, super.key});

  final AdminApi api;

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  String _filter = '';
  late Future<List<Map<String, dynamic>>> _orders;

  static const _statuses = <String, String>{
    'pending': 'بانتظار التأكيد',
    'confirmed': 'مؤكد',
    'processing': 'قيد التجهيز',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
  };

  @override
  void initState() {
    super.initState();
    _orders = _load();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final suffix = _filter.isEmpty ? '' : '?status=' + Uri.encodeQueryComponent(_filter);
    final result = await widget.api.request('/admin/orders' + suffix);
    return (result['orders'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
  }

  Future<void> _refresh() async {
    setState(() => _orders = _load());
    try {
      await _orders;
    } catch (_) {}
  }

  String _statusLabel(dynamic value) =>
      _statuses[value?.toString()] ?? value?.toString() ?? 'غير معروف';

  String _money(dynamic value) =>
      '₪ ' + (double.tryParse(value?.toString() ?? '') ?? 0).toStringAsFixed(2);

  String _date(dynamic value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    if (parsed == null) return '';
    final date = parsed.toLocal();
    return date.year.toString() +
        '/' +
        date.month.toString().padLeft(2, '0') +
        '/' +
        date.day.toString().padLeft(2, '0');
  }

  Future<void> _showOrder(Map<String, dynamic> order) async {
    final items = (order['items'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 6, 18, 24),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'تفاصيل الطلب #' + (order['id']?.toString() ?? ''),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text('الحالة: ' + _statusLabel(order['status'])),
                Text('التاريخ: ' + _date(order['created_at'])),
                Text('رقم الهاتف: ' +
                    (order['user_phone']?.toString() ??
                        order['phone']?.toString() ??
                        'غير متوفر')),
                Text('المجموع: ' + _money(order['total'])),
                const Divider(height: 24),
                const Text('الأصناف',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                ...items.map((item) {
                  final name = item['productName'] ??
                      item['product_name'] ??
                      'منتج';
                  final quantity = item['quantity'] ?? 1;
                  final price = item['unitPrice'] ?? item['unit_price'];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFF4EAF1),
                      child: Icon(Icons.shopping_bag_outlined, color: _plum),
                    ),
                    title: Text(name.toString()),
                    subtitle: Text('الكمية: ' + quantity.toString()),
                    trailing: Text(_money(price)),
                  );
                }),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(sheetContext);
                    _changeStatus(order);
                  },
                  icon: const Icon(Icons.sync_alt),
                  label: const Text('تغيير حالة الطلب'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _changeStatus(Map<String, dynamic> order) async {
    final id = order['id']?.toString();
    if (id == null) return;
    var selected = _statuses.containsKey(order['status']?.toString())
        ? order['status'].toString()
        : 'pending';
    final reason = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('تحديث الطلب #' + id),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selected,
                decoration: const InputDecoration(labelText: 'الحالة الجديدة'),
                items: _statuses.entries
                    .map((entry) => DropdownMenuItem(
                          value: entry.key,
                          child: Text(entry.value),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value != null) setDialogState(() => selected = value);
                },
              ),
              if (selected == 'cancelled') ...[
                const SizedBox(height: 10),
                TextField(
                  controller: reason,
                  decoration: const InputDecoration(
                    labelText: 'سبب الإلغاء',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('رجوع'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('حفظ الحالة'),
            ),
          ],
        ),
      ),
    );
    if (confirmed != true) {
      reason.dispose();
      return;
    }
    try {
      final body = <String, Object?>{'status': selected};
      if (selected == 'cancelled') {
        body['cancelSource'] = 'admin';
        body['cancellationReason'] =
            reason.text.trim().isEmpty ? 'إلغاء من لوحة الإدارة' : reason.text.trim();
      }
      await widget.api.request(
        '/admin/orders/' + id + '/status',
        method: 'PATCH',
        body: body,
      );
      if (!mounted) return;
      Navigator.of(context).maybePop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم تحديث حالة الطلب')),
      );
      await _refresh();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      reason.dispose();
    }
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          SizedBox(
            height: 58,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              scrollDirection: Axis.horizontal,
              children: [
                _filterChip('', 'الكل'),
                ..._statuses.entries
                    .map((entry) => _filterChip(entry.key, entry.value)),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _orders,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: _ErrorPanel(
                      message: snapshot.error.toString(),
                      retry: _refresh,
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.data!.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView(
                      children: const [
                        SizedBox(height: 150),
                        Center(child: Text('ما في طلبات بهذا التصفية')),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: snapshot.data!.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final order = snapshot.data![index];
                      final count = (order['items'] as List? ?? const []).length;
                      final customer = order['user_phone'] ??
                          order['phone'] ??
                          order['customer_name'] ??
                          'طلب زبون';
                      return Card(
                        color: Colors.white,
                        child: ListTile(
                          onTap: () => _showOrder(order),
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFF4EAF1),
                            child: Icon(Icons.receipt_long, color: _plum),
                          ),
                          title: Text('طلب #' + (order['id']?.toString() ?? '')),
                          subtitle: Text(
                            customer.toString() +
                                ' · ' +
                                _statusLabel(order['status']) +
                                ' · ' +
                                count.toString() +
                                ' أصناف',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(_money(order['total']),
                                  style: const TextStyle(
                                      color: _plum,
                                      fontWeight: FontWeight.bold)),
                              Text(_date(order['created_at']),
                                  style: const TextStyle(fontSize: 11)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      );

  Widget _filterChip(String status, String label) => Padding(
        padding: const EdgeInsetsDirectional.only(start: 6),
        child: ChoiceChip(
          label: Text(label),
          selected: _filter == status,
          onSelected: (_) => setState(() {
            _filter = status;
            _orders = _load();
          }),
        ),
      );
}

class MoreSections extends StatelessWidget {
  const MoreSections({super.key});

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _SectionRow('التقارير والمبيعات', Icons.query_stats),
          _SectionRow('العملاء والموظفون', Icons.groups_outlined),
          _SectionRow('الكوبونات والعروض', Icons.local_offer_outlined),
          _SectionRow('إعدادات المتجر', Icons.tune),
          _SectionRow('قائمة التوفر', Icons.notifications_active_outlined),
        ],
      );
}

class _SectionRow extends StatelessWidget {
  const _SectionRow(this.title, this.icon);

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Card(
        color: Colors.white,
        child: ListTile(
          leading: Icon(icon, color: _plum),
          title: Text(title),
          trailing: const Icon(Icons.chevron_left),
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('هذا القسم قادم ضمن المرحلة التالية.')),
          ),
        ),
      );
}

class _ComingSoon extends StatelessWidget {
  const _ComingSoon({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.construction_outlined, size: 48, color: _plum),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontSize: 20)),
            const SizedBox(height: 6),
            const Text('هذا القسم قيد التنفيذ ضمن مراحله.'),
          ],
        ),
      );
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.retry});

  final String message;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Card(
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(message, textAlign: TextAlign.center),
              TextButton.icon(
                onPressed: retry,
                icon: const Icon(Icons.refresh),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      );
}
