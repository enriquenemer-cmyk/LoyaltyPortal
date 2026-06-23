# WhatsApp Bot Setup

Scaffolding exists at `app/api/whatsapp/webhook/route.ts`. It handles Meta's verification
handshake (`GET`) and returns `501` on `POST` until `WHATSAPP_ACCESS_TOKEN` is set.

## Getting a Meta WhatsApp Business Cloud API account

1. Create a **Meta Developer account** at developers.facebook.com.
2. Create a new **App** → add the **WhatsApp** product.
3. In WhatsApp → API Setup, you get a **temporary access token** and a **test phone number**
   (or register your own business number — requires Meta Business verification for production use).
4. Note the **Phone Number ID** shown in API Setup.
5. For production: complete **Meta Business Verification** and request a permanent token via
   a System User in Meta Business Settings (temporary tokens expire in 24h).

## Env vars

- `WHATSAPP_VERIFY_TOKEN` — any string you choose; used during webhook registration handshake
- `WHATSAPP_ACCESS_TOKEN` — the (permanent) access token from Meta
- `WHATSAPP_PHONE_NUMBER_ID` — the Phone Number ID from API Setup

Set these in Vercel project settings (Production + Preview as needed).

## Pointing the webhook at this app

1. Deploy so `https://premia-tierra.vercel.app/api/whatsapp/webhook` is publicly reachable.
2. In Meta App Dashboard → WhatsApp → Configuration → Webhook:
   - Callback URL: `https://premia-tierra.vercel.app/api/whatsapp/webhook`
   - Verify token: same value as `WHATSAPP_VERIFY_TOKEN`
3. Click **Verify and Save** — Meta will hit the `GET` handler with `hub.challenge`; the route
   already returns it when `hub.verify_token` matches.
4. Subscribe to the **messages** webhook field so incoming messages get POSTed to the route.

## Enabling real replies

Once `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set:

1. Uncomment the `fetch(...)` block at the bottom of the `POST` handler in
   `app/api/whatsapp/webhook/route.ts`.
2. Redeploy. Incoming "puntos", "premio", and fallback messages will now get a live reply
   sent back through Meta's Graph API instead of just being returned in `would_reply`.

## Notes

- The intent matching is intentionally simple (substring checks on `puntos`, `cuanto`, `premio`).
  Extend with more keywords or a small NLU layer as needed.
- Phone numbers arrive from Meta in international format (e.g. `52XXXXXXXXXX` for Mexico). The
  scaffold strips a leading `52` to match how `customer_points.phone` is stored — verify this
  assumption against real data before going live.
