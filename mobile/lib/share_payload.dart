import 'dart:convert';
import 'dart:typed_data';

/// The web store may share text and its own links, never local file paths.
class StoreSharePayload {
  const StoreSharePayload({required this.text, required this.url, this.image});
  final String text;
  final Uri url;
  final Uint8List? image;

  static StoreSharePayload parse(String message, Uri store) {
    if (message.length > 4500000) {
      throw const FormatException('Share payload too large');
    }
    final value = jsonDecode(message);
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Invalid share payload');
    }
    final text = value['text'];
    final rawUrl = value['url'];
    if (text is! String || text.length > 1200 || rawUrl is! String) {
      throw const FormatException('Invalid share text');
    }
    final url = Uri.tryParse(rawUrl);
    if (url == null || url.scheme != 'https' || url.origin != store.origin ||
        url.userInfo.isNotEmpty ||
        !(url.path == '/' || url.path.startsWith('/share/'))) {
      throw const FormatException('Untrusted share URL');
    }
    Uint8List? bytes;
    final imageData = value['imageData'];
    if (imageData != null) {
      if (imageData is! String ||
          !imageData.startsWith('data:image/png;base64,')) {
        throw const FormatException('Only PNG story cards are supported');
      }
      bytes = base64Decode(imageData.substring('data:image/png;base64,'.length));
      const signature = [137, 80, 78, 71, 13, 10, 26, 10];
      if (bytes.length < 12 || bytes.length > 3 * 1024 * 1024) {
        throw const FormatException('Invalid story image');
      }
      for (var i = 0; i < signature.length; i++) {
        if (bytes[i] != signature[i]) {
          throw const FormatException('Invalid story image');
        }
      }
    }
    return StoreSharePayload(text: text, url: url, image: bytes);
  }
}
