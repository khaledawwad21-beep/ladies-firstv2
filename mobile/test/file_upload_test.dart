import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:ladies_first/file_upload.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

void main() {
  const origin = 'https://ladies-firstv2.onrender.com';
  String? url;
  bool active = true;
  late List<String> errors;
  setUp(() { url = '$origin/admin.html'; active = true; errors = []; });
  NativeFileUpload bridge(Future<List<String>> Function(FileSelectorParams) pick) =>
      NativeFileUpload(currentUrl: () async => url, allowedOrigin: origin,
        isActive: () => active, onError: errors.add, chooseFiles: pick);
  FileSelectorParams params({bool multiple = false, bool camera = false}) =>
      FileSelectorParams(isCaptureEnabled: camera, acceptTypes: ['image/*'],
        mode: multiple ? FileSelectorMode.openMultiple : FileSelectorMode.open);

  test('multiple images return escaped file URIs and preserve content URIs', () async {
    final result = await bridge((_) async => ['/cache/one photo.jpg', 'content://media/2'])
        .select(params(multiple: true));
    expect(result, ['file:///cache/one%20photo.jpg', 'content://media/2']);
  });
  test('camera request reaches picker; single input returns one file', () async {
    final upload = bridge((request) async {
      expect(request.isCaptureEnabled, isTrue);
      return ['/cache/camera.jpg', '/cache/extra.jpg'];
    });
    expect(await upload.select(params(camera: true)), ['file:///cache/camera.jpg']);
  });
  test('cancellation releases callback and next attempt succeeds', () async {
    int attempts = 0;
    final upload = bridge((_) async => ++attempts == 1 ? [] : ['/cache/photo.jpg']);
    expect(await upload.select(params()), isEmpty);
    expect(await upload.select(params()), ['file:///cache/photo.jpg']);
    expect(errors, isEmpty);
  });
  test('untrusted origin never opens native picker', () async {
    url = 'https://other.invalid/';
    expect(await bridge((_) async { fail('must not open'); }).select(params()), isEmpty);
  });
  test('navigation during picking discards selected files', () async {
    expect(await bridge((_) async {
      url = '$origin/index.html'; return ['/cache/private.jpg'];
    }).select(params()), isEmpty);
  });
  test('concurrent picker is rejected; errors resolve and permit retry', () async {
    final pending = Completer<List<String>>(); int calls = 0;
    final upload = bridge((_) { calls++; return pending.future; });
    final first = upload.select(params());
    await Future<void>.delayed(Duration.zero);
    expect(await upload.select(params()), isEmpty);
    expect(calls, 1); pending.completeError(Exception('picker failed'));
    expect(await first, isEmpty); expect(errors, hasLength(1));
  });
}
