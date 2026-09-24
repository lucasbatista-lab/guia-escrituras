# Apple IAP server foundation

## Endpoints
- `POST /api/billing/apple/notifications` — App Store Server Notifications V2 (`{ signedPayload }`)
- `POST /api/billing/apple/claim` — authenticated claim of a verified transaction JWS (`{ signedTransaction }`)

## Environment
See `.env.example` (`APPLE_*`). When `APPLE_BUNDLE_ID` is unset, web/Stripe keep working and Apple routes return 503.

## Product mapping
`APPLE_PRODUCT_ESSENCIAL|CAMINHO|PROFUNDO` → `planKey`. Unknown products never grant entitlement.

## Sandbox vs production
Rows are scoped by `environment`. Entitlement loads only the configured `APPLE_IAP_ENVIRONMENT`.

## Grace / billing retry
- Grace period (`grace`): **grants** access
- Billing retry without grace: **no** access
- Refund / revoke / expired: **no** Apple access (Stripe may still grant)
