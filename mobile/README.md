# Ladies First — Flutter Android trial

This **new test build** is a small Flutter mobile shell opening the existing
Ladies First production website in an Android WebView. It is **not** the
previous Flutter source built in ChatGPT Work, which is not available in this
repository. It does not claim to be a fully native client or store-ready app.

Features:
- Full storefront, catalog, checkout and user features served by the existing website.
- Retains web session when navigating within the site.
- Native Android back button goes back inside the storefront.
- Native loading state and a retry screen if the main page cannot load.
- Opens WhatsApp, telephone and SMS/email links externally.
- Does not modify or deploy the production website/backend.

The Android test APK is compiled by the GitHub Actions workflow
`.github/workflows/flutter-android-test.yml`. It generates the Android project
files at build time. The package id is based on `com.ladiesfirst.ladies_first`.
Find the installable `app-debug.apk` in the successful Actions run's artifact
`ladies-first-android-debug-apk`.

**Known limitations:** No verified Android device test; voice/microphone,
file-picker behavior, third-party sign-in, payment redirects, push notifications
and native service integrations need explicit device testing and dedicated
implementation. This is a debug APK only, not a signed Google Play release
(AAB) or Apple App Store release. A thin WebView client might not meet app-store
quality/policy requirements; the full native app is a separate next phase.

To replace with the original Flutter Work project, back it up and upload its
actual source to `mobile/` on the `feature/flutter-mobile-app` branch. Preserve
any existing Android and iOS project files, resolve conflicts carefully, and
build/test before release.
