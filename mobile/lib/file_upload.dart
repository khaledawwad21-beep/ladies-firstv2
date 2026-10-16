import 'package:file_selector/file_selector.dart' as files;
import 'package:image_picker/image_picker.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

/// Android WebView does not open HTML file inputs without a host callback.
/// Only files explicitly selected by the user are returned to the page.
class NativeFileUpload {
  NativeFileUpload({
    required this.currentUrl,
    required this.allowedOrigin,
    required this.isActive,
    required this.onError,
    Future<List<String>> Function(FileSelectorParams)? chooseFiles,
  }) : _chooseFiles = chooseFiles ?? _pick;

  final Future<String?> Function() currentUrl;
  final String allowedOrigin;
  final bool Function() isActive;
  final void Function(String) onError;
  final Future<List<String>> Function(FileSelectorParams) _chooseFiles;
  bool _busy = false;

  Future<List<String>> select(FileSelectorParams params) async {
    if (_busy || !isActive()) return [];
    _busy = true;
    try {
      final start = await currentUrl();
      if (Uri.tryParse(start ?? '')?.origin != allowedOrigin ||
          params.mode == FileSelectorMode.save) return [];
      final paths = await _chooseFiles(params);
      // Never pass a selection to a different page after navigation.
      if (!isActive() || await currentUrl() != start) return [];
      final selected = params.mode == FileSelectorMode.openMultiple
          ? paths
          : paths.take(1);
      return selected.where((path) => path.isNotEmpty).map((path) {
        final uri = Uri.tryParse(path);
        return uri?.scheme == 'content' || uri?.scheme == 'file'
            ? path
            : Uri.file(path).toString();
      }).toList();
    } catch (_) {
      if (isActive()) {
        onError('تعذر فتح الصور أو الكاميرا. أغلق أي نافذة اختيار مفتوحة وأعد المحاولة، أو اختر الصورة من الملفات.');
      }
      return [];
    } finally {
      _busy = false;
    }
  }

  static Future<List<String>> _pick(FileSelectorParams params) async {
    final types = params.acceptTypes
        .expand((value) => value.split(','))
        .map((value) => value.trim().toLowerCase())
        .where((value) => value.isNotEmpty)
        .toList();
    if (params.isCaptureEnabled &&
        types.isNotEmpty && types.every((type) => type.startsWith('image/'))) {
      final image = await ImagePicker().pickImage(source: ImageSource.camera);
      return image == null ? [] : [image.path];
    }
    final mimeTypes = types.where((type) => type.contains('/')).toList();
    final extensions = types.where((type) => type.startsWith('.'))
        .map((type) => type.substring(1)).toList();
    final groups = types.isEmpty || types.contains('*/*')
        ? <files.XTypeGroup>[]
        : [files.XTypeGroup(label: 'Files',
            mimeTypes: mimeTypes.isEmpty ? null : mimeTypes,
            extensions: extensions.isEmpty ? null : extensions)];
    if (params.mode == FileSelectorMode.openMultiple) {
      return (await files.openFiles(acceptedTypeGroups: groups))
          .map((file) => file.path).toList();
    }
    final file = await files.openFile(acceptedTypeGroups: groups);
    return file == null ? [] : [file.path];
  }
}
