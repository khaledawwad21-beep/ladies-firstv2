# Ladies First — WhatsApp contact reasons and automatic replies

## Contact button (no WhatsApp API credentials required)
On the website (and Android app's embedded storefront), customer taps the
WhatsApp shortcut in the bottom navigation, floating shortcut, or side social
list and chooses a reason:

- Product question
- Order tracking
- Delivery
- Returns/exchange
- Promotions/coupons
- Complaint
- Other

An optional free-text field is included. The customer is taken to the store's
currently configured WhatsApp number with the topic and details **pre-filled**.
**The customer must press Send in WhatsApp.** Other intentional WhatsApp flows,
such as sending a completed order or sharing a product offer, remain untouched.

## True automatic reply — Meta WhatsApp Business Cloud API
The website's `wa.me` link **cannot** auto-answer a customer.
A customer-originated inbound WhatsApp message needs an official Meta Business
Cloud API phone number and a verified webhook. This code includes an optional,
disabled-by-default webhook that sends *one acknowledgement*, not false order
status or unverified inventory claims.

Callback URL: `https://ladies-firstv2.onrender.com/api/whatsapp/inbound`

Configure on Render **server-side only**:

| Variable | Purpose |
|---|---|
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Random secret chosen by the operator, at least 16 characters; same token entered in Meta webhook verification |
| `WHATSAPP_APP_SECRET` | Meta App Secret; used for incoming `X-Hub-Signature-256` verification |
| `WHATSAPP_ACCESS_TOKEN` | Meta access token; existing outbound WhatsApp automation setting |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID belonging to the number receiving customer messages |
| `WHATSAPP_API_VERSION` | Optional, default `v23.0`; verify active Meta API version |
| `WHATSAPP_AUTO_REPLY_ENABLED` | Set to `true` **after** successful private Meta webhook test; omitted/false disables replies |

Subscribe the Meta WhatsApp Business Account webhook to `messages`.
Meta should verify the callback via the GET challenge. The POST webhook checks
the HMAC signature using the unmodified incoming JSON bytes, ignores status
updates and other businesses' phone IDs, and stores only sender number,
provider message ID, and topic for de-duplication. It sends no replies while
disabled. One automated acknowledgement per sender per five minutes is
attempted, and duplicate incoming message IDs are suppressed.

**Prerequisites:** the store number used in the UI should correspond to the
verified WhatsApp Business API number. Personal or ordinary WhatsApp Business
app accounts **do not automatically support** the Cloud API webhook. Determine
whether the number can be registered/coexist on the chosen Meta setup before
changing phone configuration. Do not paste tokens or secrets into the GitHub
repository or a chat.

## Limitations
- The reply confirms the **message was received by the automated system**;
  it is not an automated check of order status, refunds or stock.
- Sending a prefilled WhatsApp link does not imply that the customer actually
  sent the message; do not log it as sent in the backend.
- Out-of-window business-initiated messages require approved templates and
  opt-in under Meta rules. This webhook only answers inbound customer messages.
- One webhook reply is asynchronous after HTTP acknowledgement; failed sends
  are recorded for investigation, not automatically retried. For a
  production-grade conversational assistant, add durable job processing and
  admin inbox monitoring.
- Confirm the complete store and app contact flow on a real Android device
  before publishing to all customers.
