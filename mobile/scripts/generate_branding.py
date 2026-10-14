"""Generate native startup art from the approved icon, without modifying store branding."""
from pathlib import Path
import xml.etree.ElementTree as ET
import base64
import cairosvg

root = Path(__file__).resolve().parents[1]
res = root / 'android/app/src/main/res'
source = root / 'branding/ladies-first-app-icon.svg'
asset = root / 'assets/app-icon.png'
asset.parent.mkdir(parents=True, exist_ok=True)
cairosvg.svg2png(url=str(source), write_to=str(asset), output_width=512, output_height=512)
for density, size in [('mdpi',48), ('hdpi',72), ('xhdpi',96), ('xxhdpi',144), ('xxxhdpi',192)]:
    target = res / ('mipmap-' + density) / 'ic_launcher.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(source), write_to=str(target), output_width=size, output_height=size)
# Android 8+ launchers may prefer mipmap-anydpi-v26/ic_launcher.xml over the
# legacy density PNGs. Flutter's generated template can otherwise retain a
# Flutter-logo adaptive resource even when all mipmap PNGs are branded.
adaptive_dir = res / 'mipmap-anydpi-v26'
adaptive_dir.mkdir(parents=True, exist_ok=True)
adaptive_dir.joinpath('ic_launcher.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/lf_cream" />
  <foreground android:drawable="@drawable/lf_launcher_foreground" />
</adaptive-icon>
''')
# Provide safe padding for the system's circular/squircle icon masks.
adaptive_svg = ET.Element('{http://www.w3.org/2000/svg}svg', {
    'width': '1024', 'height': '1024', 'viewBox': '0 0 1024 1024'
})
adaptive_center = ET.SubElement(adaptive_svg, '{http://www.w3.org/2000/svg}g', {
    'transform': 'translate(133 133) scale(0.74)'
})
adaptive_center.append(ET.parse(source).getroot())
adaptive_png = res / 'drawable-nodpi/lf_launcher_foreground.png'
adaptive_png.parent.mkdir(parents=True, exist_ok=True)
cairosvg.svg2png(bytestring=ET.tostring(adaptive_svg, encoding='utf-8'),
                write_to=str(adaptive_png),
                output_width=432, output_height=432)

# Android 12+ clips the splash icon to a circle. Use the standalone transparent
# flower mark here; the square app tile remains the external launcher icon.
ns = 'http://www.w3.org/2000/svg'
ET.register_namespace('', ns)
splash = ET.Element(f'{{{ns}}}svg', {
    'width': '1024', 'height': '1024', 'viewBox': '0 0 1024 1024'
})
ET.SubElement(splash, f'{{{ns}}}rect', {
    'width': '1024', 'height': '1024', 'fill': '#FBF4EC'
})
center = ET.SubElement(splash, f'{{{ns}}}g', {
    'transform': 'translate(194 194) scale(0.62)'
})
mark_data = base64.b64encode((root / 'assets/brand-mark.png').read_bytes()).decode('ascii')
ET.SubElement(center, f'{{{ns}}}image', {
    'x': '0', 'y': '0', 'width': '1024', 'height': '1024',
    'href': 'data:image/png;base64,' + mark_data,
    '{http://www.w3.org/1999/xlink}href': 'data:image/png;base64,' + mark_data,
})
splash_asset = res / 'drawable-nodpi/lf_splash_icon.png'
splash_asset.parent.mkdir(parents=True, exist_ok=True)
cairosvg.svg2png(bytestring=ET.tostring(splash, encoding='utf-8'),
                write_to=str(splash_asset),
                output_width=432, output_height=432)

for folder in ['drawable', 'drawable-v21']:
    target = res / folder / 'launch_background.xml'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text('''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/lf_cream" />
  <item><bitmap android:gravity="center" android:src="@mipmap/ic_launcher" /></item>
</layer-list>
''')
(res / 'values').mkdir(exist_ok=True)
(res / 'values/lf_colors.xml').write_text('''<resources><color name="lf_cream">#FBF4EC</color></resources>''')
# Android 12+ uses its own splash screen; match both light and dark system modes.
for folder in ['values-v31', 'values-night-v31']:
    target = res / folder / 'styles.xml'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text('''<resources>
  <style name="LaunchTheme" parent="@android:style/Theme.Light.NoTitleBar">
    <item name="android:windowSplashScreenBackground">@color/lf_cream</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/lf_splash_icon</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:statusBarColor">#5B3154</item>
    <item name="android:navigationBarColor">@color/lf_cream</item>
  </style>
</resources>
''')
print('Approved icon and native startup branding generated.')


// Generate the complete iOS app icon catalog from the same approved artwork.
// Keeping the artwork source shared prevents the iPhone and Android icons from
// drifting apart.
import json

ios_icon_set = root / 'ios/Runner/Assets.xcassets/AppIcon.appiconset'
if ios_icon_set.parent.exists():
    ios_icon_set.mkdir(parents=True, exist_ok=True)
    images = []
    icon_slots = [
        ('iphone', '20x20', 2), ('iphone', '20x20', 3),
        ('iphone', '29x29', 2), ('iphone', '29x29', 3),
        ('iphone', '40x40', 2), ('iphone', '40x40', 3),
        ('iphone', '60x60', 2), ('iphone', '60x60', 3),
        ('ipad', '20x20', 1), ('ipad', '20x20', 2),
        ('ipad', '29x29', 1), ('ipad', '29x29', 2),
        ('ipad', '40x40', 1), ('ipad', '40x40', 2),
        ('ipad', '76x76', 1), ('ipad', '76x76', 2),
        ('ipad', '83.5x83.5', 2),
        ('ios-marketing', '1024x1024', 1),
    ]
    for idiom, size, scale in icon_slots:
        points = float(size.split('x')[0])
        pixels = round(points * scale)
        filename = f'AppIcon-{idiom}-{size}-{scale}x.png'
        cairosvg.svg2png(
            url=str(source),
            write_to=str(ios_icon_set / filename),
            output_width=pixels,
            output_height=pixels,
        )
        image = {
            'filename': filename,
            'idiom': idiom,
            'scale': f'{scale}x',
            'size': size,
        }
        if idiom == 'ios-marketing':
            image['platform'] = 'ios'
        images.append(image)
    (ios_icon_set / 'Contents.json').write_text(json.dumps({
        'images': images,
        'info': {'author': 'xcode', 'version': 1},
    }, indent=2) + '\n')
