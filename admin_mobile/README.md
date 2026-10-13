# Ladies First Admin Mobile

A native Flutter app for store administrators. It uses the existing backend API directly; it does not embed the website or its admin page in a WebView.

## Phase 1

- Staff, admin, and owner sign-in through the existing API.
- Session token stored with the platform secure storage plugin.
- Dashboard metrics loaded from `GET /api/admin/dashboard`.
- Arabic right-to-left layout with navigation for the administration sections.
- API authorization stays on the server and uses each account's existing role and permissions.

Orders, products, inventory, reports, customers, coupons, and settings are shown in the navigation and will be implemented in their planned phases.

## Build

The GitHub Actions workflow `.github/workflows/admin-mobile-android.yml` creates the native Android project, runs Dart analysis and tests, builds a debug APK, and publishes it as the `ladies-first-admin-android-debug-apk` artifact.

This APK is for testing. Google Play or TestFlight distribution requires separate release signing and store setup.
