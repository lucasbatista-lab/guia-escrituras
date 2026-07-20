# Commercial plans — truth vs marketing

Short reference for plan differentiation and ethical upsells (V1).

## Active entitlements (runtime)

| Key | Effect |
|-----|--------|
| `chat_standard` | Chat turn allowed |
| `chat_deep` | `preferDeep` / Aprofundar on demand (Profundo, Particular when provisioned) |
| `reading_journeys` | Guided reading journeys (`/jornadas`) — Caminho, Profundo, Particular |

Defined in `src/lib/entitlements/reserved.ts` → `ACTIVE_ENTITLEMENT_KEYS`.

## Reserved entitlements (catalog only)

Not enforced in product code today — must not appear as purchasable benefits:

`chat_frequent`, `short_memory`, `extended_memory`, `multiple_personas`, `voice_responses`, `priority_support`, `human_concierge`, `custom_content`, `whatsapp_access`, `fair_use_extended`.

## What actually differentiates plans (no price/budget changes in upsell V1)

1. **Stripe price** (Essencial R$38, Caminho R$58, Profundo R$188)
2. **Internal usage budgets** (not shown publicly) — monthly fair-use + daily burst
3. **Aprofundar** — Profundo (+ Particular when provisioned)
4. **Jornadas de leitura guiadas** — Caminho, Profundo, Particular (`reading_journeys`)

## Public surfaces

- Catalog: `src/lib/entitlements/plans.ts` (`displayBenefits`, `idealFor`, `upcomingBenefits`)
- Cards: `src/components/marketing/plan-cards.tsx`
- Decision page: `/planos` (usage profiles, Aprofundar, FAQ, roadmap)
- Upsells: `src/lib/marketing/plan-upsell.ts` + `chat-plan-upsell.tsx` (contextual only)

## Plan change

**Not implemented.** Copy states troca automática em breve. No Stripe Subscription Update or proration in this block.

## Upgrade interest events

Structured logs via `POST /api/account/plan-interest` → `plan_conversion_event` (no new DB table):

- `plan_comparison_viewed`
- `deep_upsell_viewed`
- `usage_limit_upsell_viewed`
- `upgrade_interest_clicked`

No conversation content in logs.

## Tests

`tests/plan-differentiation-upsell.test.ts`, `plan-promises-checkout-guard.test.ts`, `purchase-experience.test.ts`.
