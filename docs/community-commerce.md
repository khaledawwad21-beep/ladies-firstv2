# Gifts and sharing

The store and Android/iOS WebViews share server-backed features. Flutter 0.1.6+7 adds native text/link/PNG sharing. Android output is a test APK. The iOS build requires Apple signing before installation or distribution.

Customer features: inclusive-budget gift suggestions and swaps; private-address wish lists and atomic gift claims; two/three-product comparison and deterministic Naia budget/occasion advice; delivered-purchase wardrobe with hidden gifts; named saved looks/occasions; opt-in price/low-stock account alerts; referral links; branded story PNGs; friends’ baskets and delivery-share estimates; private friend polls; gift hints; shareable looks; verified text/photo reviews with explicit consent, moderation and withdrawal.

Entry points are the home gift/sharing center, product toolbar and account center. Administration → الهدايا والمشاركة contains summaries, review moderation and settings. Marketing permission permits moderation; settings permission is additionally required for financial program changes.

Default referral discount: 5%, maximum 20 ILS, minimum merchandise 100 ILS. Inviter reward: 20 points after delivery. Review reward: zero by default. These are configurable. Referral discounts do not stack with coupons; rewards reverse on cancellation or full merchandise return. Review rewards never require positive ratings.

Alerts are inside the account while the store is open; no background push/email/WhatsApp sending. Saved occasions do not reserve inventory. Group baskets have one organizer, order, delivery address and payer; delivery splits are estimates, with no separate collections. Anonymous poll votes identify a browser, not a verified person. Images are shared through the system sheet or downloaded with a copied link; the user publishes them and adds story links.

Integration coverage includes canonical inclusive quotes, recipient privacy, duplicate-claim rollback, contributor ownership, group quantity aggregation, poll limits/upserts, referral delivery/cancellation/full-return idempotency, wardrobe privacy, opt-in alert deduplication, review consent/moderation/withdrawal and staff permission separation. CI records mobile/desktop browser evidence using isolated fixtures. No verification sends real customer messages or creates production orders.
