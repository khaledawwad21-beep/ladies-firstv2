# Ladies First — Seasonal Themes

Branch: `feat/seasonal-themes-20261011`

## Activate
1. Login to `/admin.html` with the existing owner/admin account.
2. Open **الثيمات**.
3. Choose the active season from the first dropdown (or **بدون ثيم**).
4. Optionally select a season in the second dropdown, then upload independent **desktop**, **mobile**, and **greeting card** images.
5. Click **تفعيل وحفظ التعديلات**. Refresh the storefront and verify.

The active selection and uploaded media URLs are stored in PostgreSQL `settings.seasonal_theme_config`; uploaded images are stored in the existing `uploaded_images` table through the existing admin image upload API. No new environment variables are required: `DATABASE_URL` and `JWT_SECRET` are already required for the site. `ADMIN_PASSWORD` is NOT needed because existing admin authentication protects writes.

## Behavior
- The server embeds `data-theme` and the selected state in the initial HTML for `/` and `/index.html`, eliminating theme-color flashes.
- Theme CSS is additive, preserves existing store colors and logic, and respects mobile/RTL.
- Seasonal images are inserted as a temporary first slide without overwriting the regular slider configuration.
- A soft seasonal greeting appears under the header. When the theme is **none**, the store remains visually unchanged.
- Uploaded images are validated as same-origin paths or http/https URLs; administrators should preferably use the built-in upload picker so images remain durable in PostgreSQL.
- All original 21 gift cards remain available; six new seasonal options appear in the existing greeting card designer. Checkout and server order validation accept these new options.
- New Year display year is computed for Asia/Hebron. July–December refers to the next year; January–June refers to the current year.
- **Important:** Do not embed fixed year numerals in uploaded New Year artwork; use a year-free image. The greeting label uses live year data.
- Upload separate text-free card artwork where possible, to avoid overlap with the customer's editable message. If empty, the configured desktop banner is shown; otherwise the built-in lightweight SVG card design is used.

## Caveat
This change includes lightweight SVG fallback greeting-card backgrounds but does not embed the earlier image-generated photographic banner PNGs in the repository; upload approved banners via the new panel. Banner uploads are optional and can be changed later. There are no new seasonal image-generation dependencies.

## Testing
`cd backend && npm test` runs season validation, SSR output, and New Year rollover tests, alongside the existing regression tests.
