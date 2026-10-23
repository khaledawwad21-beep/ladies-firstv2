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

## Approved photograph restoration and greeting catalog (October 11 fix)

The placeholder SVGs from the first release were not the approved designs. A separate optimized photo bundle now contains **the original six season banners** (the New Year image was revised to avoid a baked-in year), plus **18 bespoke, text-free greeting cards** derived from the original seasonal artwork: three for each of the six celebrations. Cards reserve space for a custom greeting, the recipient and sender, and the official logo within the existing 15 × 10 cm RTL layout.

Since GitHub's code-text integration cannot attach the generated binary photos in this run, they are provided as `Ladies_First_Official_Seasonal_Designs.zip` alongside the implementation. To install them in production, download that file from the accompanying ChatGPT message, open **Admin → الثيمات → استيراد التصاميم الفخمة المعتمدة دفعة واحدة**, and select the ZIP. The browser reads 24 WebP images without extra libraries, uploads them via the existing authenticated image endpoint, then atomically records all their URLs in PostgreSQL. The admin can change the three card images separately afterward. **The photo bundle is not installed on production until this one-time import is completed.**

Each of the six seasonal occasions now has **ten suggestions for feminine recipients and ten for masculine recipients**, in addition to the twenty-one original nonseasonal card designs. The 12-word check remains. A gift card's message remains customizable.

To avoid dropping or clipping the full seasonal scene on mobile, the responsive hero retains object-fit contain; separate mobile images may be added from Admin at any time.


## Four additional seasonal storefront themes

The active-theme selector also includes **spring, summer, autumn, and winter**. Each uses its own CSS color variables, Arabic welcome line, and small colored/open-line SVG ornaments. Their admin editor supports desktop and mobile banners; it intentionally does not offer greeting-card designs for these four storefront-only themes. The six celebration themes and their existing greeting-card tools remain separate.
