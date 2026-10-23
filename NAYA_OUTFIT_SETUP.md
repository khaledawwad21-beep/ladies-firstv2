# Naya voice and daily outfit image

Customers collect 1–5 compatible garments/accessories, choose a catalog photo where available, review the outfit, and explicitly confirm one image. This generates an illustration on the fixed adult Naya reference (`frontend/naya-boutique.png`), not on the customer's own photograph. Optional height, weight, bust, waist and hips are sent to OpenAI only with explicit customer consent, to approximate body proportions while preserving Naya identity. The server validates numeric bounds before reserving quota. Measurements are not persisted in customer profiles or outfit selection rows; only the resulting image is saved. OpenAI may retain request data under its applicable policy. Inputs and consent clear on modal close or account change. This is not a precise fit prediction. Image fidelity and fit are approximate and must be checked in a real provider test before launch.

The existing shopping assistant now offers an opt-in AI voice button on each successful reply. The clip is reused for subsequent listening in that page session; opening chat or getting a reply does not automatically request paid speech. The existing `/api/ai/tts` rate limit applies.

## Render configuration

- `OPENAI_API_KEY`: server secret only, already used by existing chat/speech.
- `NAYA_OUTFIT_ENABLED=true`: explicitly enable paid image calls. Default is off; customers can still collect pieces.
- `NAYA_IMAGE_MODEL=gpt-image-1.5`: default; uses OpenAI Images Edit with the Naya reference and all selected product photographs in one request, medium quality, 1024×1536. FASHN pricing does not apply to this integration. Verify provider availability and current pricing before activation.
- `NAYA_OUTFIT_MONTHLY_LIMIT=100`: default store-wide monthly *attempt* cap, configurable from 1 to 10000. Failed attempts also count against this cap because a failed/ambiguous provider response may still incur cost. This is not a dollar spending limit; configure a provider account budget too.

Startup migrations create `naya_outfit_daily` and `naya_outfit_budget`. A logged-in customer's quota uses their account ID and the Palestine calendar date (`Asia/Jerusalem`), not local browser storage. A transaction reserves the job and monthly attempt before any provider request. Same-account simultaneous requests cannot generate duplicate images. Successful PNGs are persisted in PostgreSQL and served only to the authenticated owning account. Failed generation releases the customer's daily quota. The server never automatically retries a paid provider call.

Catalog images must be uploaded store images (`/api/images/...`), local frontend PNG/JPEG/WebP files, or catalog data URLs, up to 8 MB each. Arbitrary remote URLs are deliberately rejected. Only active products can be submitted. Selected catalog image order follows primary, sort order, ID. Selecting another photo does not imply a guaranteed stock variant; checkout remains the source of inventory/variant selection.

## Operations and limits

Deploy this change before setting the enable flag. Test a single actual paid request and review identity, product details, speech, mobile display, and downloads before exposing paid generation widely. No real paid provider request was made during automated tests.

A process restart or DB outage during generation can leave a job `pending`; the UI reports it as processing and prevents duplicate charges. Review such jobs against provider usage before manually releasing them. Do not automatically reset pending jobs on a timer. Generated PNGs are retained in the DB without automatic expiry; monitor DB size and apply a retention policy before sustained traffic. Quota is per account, not a guarantee of one person across multiple accounts.
