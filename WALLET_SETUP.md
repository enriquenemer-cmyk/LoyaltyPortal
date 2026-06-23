# Wallet Pass Setup

Scaffolding exists at `app/api/wallet/apple/[token]/route.ts` and `app/api/wallet/google/[token]/route.ts`.
Both currently return `501 Not Implemented`. This doc explains what's needed to finish them.

## Apple Wallet (.pkpass)

### Requirements
1. **Apple Developer Program membership** (paid, $99/year).
2. **Pass Type ID** — created at developer.apple.com under Certificates, Identifiers & Profiles → Pass Type IDs.
3. **Pass Type ID Certificate** — generate a CSR, upload to Apple, download the `.cer`, export as `.p12` from Keychain Access. Base64-encode it for `APPLE_PASS_CERT`.
4. **Apple WWDR certificate** (intermediate CA cert, downloadable from Apple).
5. **Team ID** — found in your Apple Developer account membership page.

### Env vars
- `APPLE_PASS_CERT` — base64-encoded `.p12` file
- `APPLE_PASS_CERT_PASSWORD` — password used when exporting the `.p12`
- `APPLE_PASS_TYPE_ID` — e.g. `pass.com.premiatierra.loyalty`
- `APPLE_TEAM_ID` — your 10-character Apple Team ID

### Implementation sketch
```
npm install passkit-generator
```
```ts
import { PKPass } from 'passkit-generator';

const pass = await PKPass.from({
  model: './wallet-models/storeCard', // pass.json + icon/logo assets
  certificates: {
    wwdr: process.env.APPLE_WWDR_CERT,
    signerCert: Buffer.from(process.env.APPLE_PASS_CERT!, 'base64'),
    signerKeyPassphrase: process.env.APPLE_PASS_CERT_PASSWORD,
  },
}, {
  serialNumber: token,
  description: 'Super Tierra Loyalty Card',
});
pass.primaryFields.push({ key: 'points', label: 'Puntos', value: profile.total_points });
return new Response(pass.getAsBuffer(), {
  headers: { 'Content-Type': 'application/vnd.apple.pkpass' },
});
```
Docs: https://developer.apple.com/documentation/walletpasses

## Google Wallet

### Requirements
1. **Google Cloud project** with the **Google Wallet API** enabled.
2. **Service account** with the "Wallet Object Issuer" role, JSON key downloaded.
3. **Issuer ID** — obtained after requesting access via the Google Pay & Wallet Console (business verification required).

### Env vars
- `GOOGLE_WALLET_ISSUER_ID` — numeric issuer ID assigned by Google
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` — full JSON key, stringified (store as a secret, not in git)

### Implementation sketch
```
npm install google-auth-library
```
```ts
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON!),
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});
const client = await auth.getClient();
// Create/patch a LoyaltyClass + LoyaltyObject via the Wallet Objects REST API,
// then sign a JWT and return a "Add to Google Wallet" save link:
// https://pay.google.com/gp/v/save/<signed_jwt>
```
Docs: https://developers.google.com/wallet

## Once configured

1. Set the env vars above in Vercel project settings.
2. Replace the 501 responses in both routes with real pass generation.
3. Wire the "Agregar a Wallet" button on `app/p/[token]/page.tsx` to link to these endpoints (remove `disabled`).
