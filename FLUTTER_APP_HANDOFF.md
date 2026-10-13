# Ladies First Flutter app — Work handoff

Source of truth for the Flutter app is the existing Work session. Do not recreate it from scratch or modify the live web storefront.

## Where to save the app
- Repository: khaledawwad21-beep/ladies-firstv2
- Branch: feature/flutter-mobile-app
- Target directory: mobile/
- Required Flutter files in mobile/: pubspec.yaml, lib/, android/, ios/ (if produced), assets/, test/, and any required Flutter project configuration.
- Do not commit .env, API keys, service account files, signing keys, build/, .dart_tool/, or private credential files.

## Suggested next actions for Work
1. Inspect the existing locally saved Flutter project and retain all previous fixes.
2. Verify flutter analyze and flutter test (the previous run reported three passing tests).
3. Move/copy the existing project into mobile/ on the application branch without replacing the web frontend or backend.
4. Commit and push the source code and project assets to this branch.
5. Check GitHub Actions workflow `.github/workflows/flutter-android-test.yml`; on a push to mobile/** it attempts to build an Android **debug APK** and uploads it as an Actions artifact.
6. If the build fails, inspect the Action logs, fix the root cause, and retry.
7. After the APK works on a real Android device, plan release signing / Play Store App Bundle (AAB) and iOS signing / App Store separately. Never upload secret signing material into the public repository.

Note: This handoff doesn't assert that the Flutter app has already been uploaded, or that the APK has already built successfully.
