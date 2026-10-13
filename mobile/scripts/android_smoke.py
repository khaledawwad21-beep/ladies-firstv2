"""Non-destructive smoke checks of the installed APK on a fresh Android emulator.
No accounts, messages, orders or server data are created. UI evidence is public.
"""
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

out = Path('android-evidence')
out.mkdir(exist_ok=True)
package = 'com.ladiesfirst.ladies_first'
checks = []


def adb(*args, timeout=25):
    return subprocess.check_output(['adb', *args], timeout=timeout)


def snapshot(name):
    (out / (name + '.png')).write_bytes(adb('exec-out', 'screencap', '-p'))


last_ui_error = ''


def nodes():
    """UIAutomator occasionally returns no root during a fresh emulator boot.

    Retry from find() instead of failing on a missing dump file. Never reuse a
    stale hierarchy: each probe removes the previous XML first.
    """
    global last_ui_error
    path = '/sdcard/lf-window.xml'
    try:
        adb('shell', 'rm', '-f', path)
        message = adb('shell', 'uiautomator', 'dump', path, timeout=35).decode(
            errors='replace'
        )
        if 'ERROR:' in message or 'null root node' in message.lower():
            last_ui_error = message.strip()
            return []
        xml = adb('shell', 'cat', path, timeout=12).decode(errors='replace')
        root = ET.fromstring(xml)
        (out / 'last-window.xml').write_text(xml)
        last_ui_error = ''
        return list(root.iter('node'))
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
            ET.ParseError, OSError) as exc:
        last_ui_error = f'{type(exc).__name__}: {exc}'
        return []


def label(node):
    return (node.get('text', '') + ' ' + node.get('content-desc', '')).strip()


def find(names, timeout=30, exact=False):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        for node in nodes():
            value = label(node)
            if any(value == name if exact else name in value for name in names):
                bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
                if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                    return node
        time.sleep(1)
    snapshot('failure')
    (out / 'ui-probe-error.txt').write_text(last_ui_error)
    raise AssertionError(
        'Visible control missing: ' + ', '.join(names) +
        ('; last UIAutomator error: ' + last_ui_error if last_ui_error else '')
    )


def tap(names, exact=False):
    node = find(names, exact=exact)
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
    time.sleep(0.8)


def passed(name):
    checks.append(name)
    (out / 'results.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
    print('PASS:', name, flush=True)


try:
    adb('install', '-r', 'apk/app-debug.apk', timeout=120)
    passed('APK installed on Android 35')
    adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
    adb('shell', 'wm', 'dismiss-keyguard')
    adb('shell', 'am', 'start', '-W', '-n', package + '/.MainActivity')
    snapshot('01-startup')
    find(['فتح القائمة'], timeout=90)
    snapshot('02-storefront')
    passed('Storefront became visible after launch')
    tap(['فتح القائمة'])
    find(['الأصناف'])
    snapshot('03-sidebar')
    passed('Sidebar opens with categories')
    tap(['تسجيل الدخول الاختياري'])
    find(['الدخول أو إنشاء حساب'])
    snapshot('04-phone-login')
    passed('Phone login opens from sidebar')
    tap(['إيميل'])
    # Android WebView can show an HTML input placeholder visually without
    # exposing it as a UIAutomator text node. Verify the actual transition:
    # phone-only controls must disappear in email mode.
    values = [label(n) for n in nodes()]
    assert not any('تحديد الدولة تلقائيًا' in v for v in values), values
    assert not any('فلسطين (+970)' in v for v in values), values
    snapshot('05-email-login')
    passed('Email login hides country controls')
    tap(['إنشاء حساب'], exact=True)
    # A mode-specific submit button has stable accessible text, unlike
    # placeholders of the newly visible input fields.
    find(['إنشاء الحساب'], exact=True)
    snapshot('06-register')
    passed('Registration changes the submit control and reveals registration mode')
    tap(['تسجيل الدخول'], exact=True)
    values = [label(n) for n in nodes()]
    assert not any(v == 'إنشاء الحساب' for v in values), values
    passed('Login restores its submit control and hides registration mode')
    tap(['إغلاق نافذة الحساب'])
    tap(['السلة'], exact=True)
    snapshot('07-cart')
    passed('Cart opens without signing in')
    # Reopen the process, preserving app data, to verify subsequent launches.
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    find(['فتح القائمة'], timeout=90)
    snapshot('08-relaunch')
    passed('Storefront survives process relaunch')
    # Simulate loss of connectivity on this disposable emulator only.
    adb('shell', 'svc', 'wifi', 'disable')
    adb('shell', 'svc', 'data', 'disable')
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    offline = find(['المتجر ما فتح بالشكل الصحيح', 'فتح القائمة'], timeout=85)
    snapshot('09-offline')
    passed('Offline launch reaches error recovery or a cached storefront, not permanent blank')
    adb('shell', 'svc', 'wifi', 'enable')
    adb('shell', 'svc', 'data', 'enable')
    time.sleep(3)
    if 'المتجر ما فتح' in label(offline):
        tap(['إعادة المحاولة'])
    else:
        adb('shell', 'am', 'force-stop', package)
        adb('shell', 'am', 'start', '-n', package + '/.MainActivity')
    find(['فتح القائمة'], timeout=90)
    snapshot('10-recovered')
    passed('Storefront returns after connectivity is restored')
    adb('shell', 'am', 'start', '-a', 'android.settings.APPLICATION_DETAILS_SETTINGS', '-d', 'package:' + package)
    find(['Ladies First'])
    snapshot('11-installed-app-icon')
except Exception:
    snapshot('failure')
    raise
finally:
    (out / 'logcat.txt').write_bytes(adb('logcat', '-d', '-t', '500'))
