# Ladies First — Flutter Android apps

This Flutter project builds two separately installable Android apps from the
same codebase: the customer storefront and the secured management app. Both
connect to the existing Ladies First service, so products, orders, and settings
remain shared with the website. The management app opens the existing admin
login and full dashboard; admin access still uses the server's existing role
checks and permissions.

Features:
- Full storefront, catalog, checkout and customer features served by the existing website.
- Separate `Ladies First إدارة` app for the complete management dashboard.
- Independent Android package IDs, so the customer and admin apps can be installed together.
- Retains web session when navigating within the site.
- Native Android back button goes back inside the current app.
- Native loading state and a retry screen if the main page cannot load.
- Opens WhatsApp, telephone and SMS/email links externally.
- Does not modify or deploy the production website/backend.

The GitHub Actions workflow `.github/workflows/flutter-android-test.yml`
generates the Android project and builds two debug APK artifacts:

- `ladies-first-android-debug-apk` — customer app (`APP_MODE=store`).
- `ladies-first-admin-android-debug-apk` — admin app (`APP_MODE=admin`).

Both builds are analyzed and tested. The emulator smoke test installs both apps
side by side and verifies that the admin package opens the admin login page.

**Known limitations:** These are debug APKs for device testing, not signed
Google Play releases (AAB) or Apple App Store builds. Admin screens use the
existing web dashboard inside the installed Flutter app, so all dashboard
functions remain in sync with the site. Voice/microphone, file-picker behavior,
third-party sign-in, payment redirects, push notifications and native service
integrations still need explicit device testing.

To replace with the original Flutter Work project, back it up and upload its
actual source to `mobile/` on the `feature/flutter-mobile-app` branch. Preserve
any existing Android and iOS project files, resolve conflicts carefully, and
build/test before release.

CI note: Android SDK comes preinstalled on the GitHub Ubuntu runner.
