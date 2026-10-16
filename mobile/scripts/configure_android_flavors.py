from pathlib import Path
import re


app_gradle = Path("android/app/build.gradle.kts")
is_kotlin = app_gradle.exists()
if not is_kotlin:
    app_gradle = Path("android/app/build.gradle")
if not app_gradle.exists():
    raise SystemExit("Flutter did not generate the Android app Gradle file")

gradle = app_gradle.read_text()
if "create(\"admin\")" in gradle or 'create("store")' in gradle:
    raise SystemExit("Android app flavors are already configured; refusing duplicate setup")

if is_kotlin:
    flavors = '''    flavorDimensions += "app"
    productFlavors {
        create("store") {
            dimension = "app"
            manifestPlaceholders["appName"] = "Ladies First"
        }
        create("admin") {
            dimension = "app"
            applicationIdSuffix = ".admin"
            manifestPlaceholders["appName"] = "Ladies First إدارة"
        }
    }
'''
else:
    flavors = '''    flavorDimensions "app"
    productFlavors {
        store {
            dimension "app"
            manifestPlaceholders = [appName: "Ladies First"]
        }
        admin {
            dimension "app"
            applicationIdSuffix ".admin"
            manifestPlaceholders = [appName: "Ladies First إدارة"]
        }
    }
'''

gradle, count = re.subn(r"android\s*\{", lambda match: match.group(0) + "\n" + flavors, gradle, count=1)
if count != 1:
    raise SystemExit("Could not find the Android app configuration block")
app_gradle.write_text(gradle)

manifest_path = Path("android/app/src/main/AndroidManifest.xml")
manifest = manifest_path.read_text()
manifest, count = re.subn(r'android:label="[^"]*"', 'android:label="${appName}"', manifest, count=1)
if count != 1:
    raise SystemExit("Could not set the app label resource in AndroidManifest.xml")
manifest_path.write_text(manifest)

print("Configured separate store and admin Android app flavors")
