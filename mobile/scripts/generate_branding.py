"""Generate native startup art from the approved icon, without modifying store branding."""
from pathlib import Path
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
    <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:statusBarColor">#5B3154</item>
    <item name="android:navigationBarColor">@color/lf_cream</item>
  </style>
</resources>
''')
print('Approved icon and native startup branding generated.')
