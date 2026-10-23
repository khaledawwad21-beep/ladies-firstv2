# Naya AI and 3D readiness

## OpenAI on Render

Set `OPENAI_API_KEY` as a secret on the existing Render service `ladies-firstv2`. Do not put it in this repository or in browser code.

- Chat uses `gpt-6-luna` by default. Optional override: `NAYA_OPENAI_MODEL`.
- The listen button calls the server-only `/api/ai/tts` route with the same OpenAI key.
- Speech uses `gpt-4o-mini-tts` and the `coral` voice by default. Optional voice override: `NAYA_TTS_VOICE`.
- Speech is generated only when a customer taps the listen button. Each assistant message labels it as an AI-generated voice.
- The TTS endpoint accepts up to 1,200 characters and limits repeated requests per IP.
- The AI prompt keeps Naya focused on Ladies First products, gift suggestions, orders, account help, and store policies.

## Storefront chat, search and cost guard\n\n- The storefront assistant is branded as Naya and uses `/api/ai/store-chat`. It searches active catalog names, descriptions, categories and brands before sending matched products to the model. Only public store policies/settings are included.\n- The AI path is capped at 15 messages per customer per day and 450 output tokens per response. Guest counters use a hashed IP. If `OPENAI_API_KEY` is absent, the assistant falls back to database product search and public store settings without calling an AI provider.\n- No new provider or subscription is required for code changes or GLB hosting. OpenAI model replies still use the existing API key and its usage billing when configured; Naya voice remains opt-in.\n\n## Voice acceptance check

Arabic is supported by the TTS API, but OpenAI's built-in voices are optimized for English. After API billing is enabled, listen to Palestinian Arabic samples on a phone before offering the voice to customers. If the dialect or voice quality is not natural enough, select a suitable Arabic voice provider before release.

## 3D model required

The storefront expects the animated model at:

`frontend/assets/naya/naya.glb`

That file is not currently present in the repository. Until a rigged GLB is added, Try-On intentionally keeps the approved Naya image fallback and displays `3D MODEL NEEDED`.

The model must preserve the approved Naya appearance and include the animations and attachment points listed in `frontend/assets/naya/model-contract.json`:

- Animation clips: `Idle`, `PerfumeSpray`, `BagShoulder`, `HairRevealEar`, `GlassesTryOn`, `FashionPose`, `AccessoryShow`.
- Attachment points: hands, shoulders, ear(s), head, and chest.
- Facial rig / visemes are required before claiming lip-sync is available.

After adding the asset, test every animation on a mobile device and verify the fallback still works when WebGL or the model file cannot load.

## Privacy boundary

Naya's chat receives only sanitized age and gender when applicable to a self-recommendation. Measurements remain temporary in the browser and are not sent to the chat or speech endpoints.
