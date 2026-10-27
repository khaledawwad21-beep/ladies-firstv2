"""Install only public Firebase app settings into generated native projects.
No service-account credentials, user tokens or signing keys belong in this file.
"""
import json
import os
from pathlib import Path
from urllib.request import urlopen
from xml.etree.ElementTree import Element, SubElement, ElementTree

raw = os.environ.get('FIREBASE_PUBLIC_CONFIG', '')
if raw:
    config = json.loads(raw)
else:
    try:
        with urlopen('https://ladies-firstv2.onrender.com/api/push/config', timeout=20) as r:
            config = json.load(r).get('firebase', {})
    except Exception:
        config = {}
if all(config.get(k) for k in ['apiKey', 'projectId', 'messagingSenderId', 'appIdAndroid']):
    root = Element('resources')
    for name, value in {'google_app_id': config['appIdAndroid'],
                        'gcm_defaultSenderId': config['messagingSenderId'],
                        'google_api_key': config['apiKey'],
                        'project_id': config['projectId']}.items():
        SubElement(root, 'string', {'name': name, 'translatable': 'false'}).text = value
    out = Path('android/app/src/main/res/values/firebase_push.xml')
    out.parent.mkdir(parents=True, exist_ok=True)
    ElementTree(root).write(out, encoding='utf-8', xml_declaration=True)
    print('Public Firebase Android resources configured.')
else:
    print('Firebase public settings not configured. App remains usable; push requires configuration and a rebuilt APK.')

manifest = Path('android/app/src/main/AndroidManifest.xml')
if manifest.exists():
    text = manifest.read_text()
    permission = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
    if permission not in text:
        text = text.replace('<application', permission + '\n    <application', 1)
    manifest.write_text(text)

# Entitlements are required when signing the iOS app with a provisioned team.
ios = Path('ios/Runner')
if ios.exists():
    import plistlib
    import re
    with (ios / 'Runner.entitlements').open('wb') as f:
        plistlib.dump({'aps-environment': os.environ.get('APPLE_APS_ENVIRONMENT', 'development')}, f)
    pbx = Path('ios/Runner.xcodeproj/project.pbxproj')
    if pbx.exists():
        text = re.sub(r'IPHONEOS_DEPLOYMENT_TARGET = [^;]+;', 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;', pbx.read_text())
        text = text.replace('PRODUCT_BUNDLE_IDENTIFIER = com.ladiesfirst.store;',
                            'PRODUCT_BUNDLE_IDENTIFIER = com.ladiesfirst.store;\n'
                            '                CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;')
        pbx.write_text(text)

    podfile = Path('ios/Podfile')
    if podfile.exists():
        text = podfile.read_text()
        if re.search(r"#?\s*platform :ios, '[^']+'", text):
            text = re.sub(r"#?\s*platform :ios, '[^']+'", "\nplatform :ios, '15.0'", text)
        else:
            text = "platform :ios, '15.0'\n" + text
        podfile.write_text(text)
