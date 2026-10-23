# WhatsApp delivery thank-you setup

The store sends one WhatsApp thank-you after an order first changes to **delivered**. It is sent only when the linked customer account has WhatsApp opt-in enabled and the order phone matches that account phone.

Create and approve an Arabic **Utility** WhatsApp template with these three body placeholders:

1. Customer name
2. Order number
3. Feedback link

Suggested body:

`مرحبًا {{1}}، شكرًا لاختيارك Ladies First 🌷 نتمنى أن تكون تجربتك جميلة. إذا كان لديك أي ملاحظة أو اقتراح بخصوص طلبك رقم {{2}}، يسعدنا سماعك عبر الرابط: {{3}}`

Set the approved template name in the backend environment variable `WHATSAPP_DELIVERED_TEMPLATE`. The third placeholder opens the store WhatsApp chat with the order number and a feedback prompt already filled in. The delivery message also requires the existing `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` settings.

The order is recorded before the send attempt to prevent duplicate messages if the admin changes the order status more than once. Failed sends are recorded in `order_delivery_followups`.
