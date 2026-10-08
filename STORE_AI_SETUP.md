# Storefront AI shopping assistant

The storefront assistant is separate from Naya's avatar and try-on experience. It uses the server-side `OPENAI_API_KEY` and the active product catalog.

## Render settings

- `OPENAI_API_KEY`: existing OpenAI secret on the backend service.
- `STORE_AI_DAILY_LIMIT`: messages per customer per Jerusalem calendar day; defaults to 15 and accepts values from 1 to 50.
- `STORE_AI_OPENAI_MODEL`: optional model override; defaults to `gpt-6-luna` unless `OPENAI_MODEL` is configured.
- `STORE_AI_LIMIT_SECRET`: optional secret for guest quota-key hashing; if omitted, `JWT_SECRET` is used.

Signed-in customers are limited by account ID. Guest quotas use a one-way hash of the request IP, so the raw IP is not stored in the quota table. A short-term per-IP rate limit also applies.

The AI request receives the customer's message, up to the last four turns, and active catalog fields needed for recommendations. It does not receive account profile, contact details, address, payment details, or body measurements. Recommendations are checked against currently available catalog products before they are returned.
