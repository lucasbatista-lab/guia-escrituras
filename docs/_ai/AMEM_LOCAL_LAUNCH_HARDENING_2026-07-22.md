# Local Launch Hardening — Execution Report

**Data:** 2026-07-22
**HEAD de entrada:** `bf6123d`
**Tip de produto de entrada:** `c03ff10`
**Commits do pacote:** listados por bloco (sem “HEAD final” auto-referencial).

---

## Bloco 1 — Crise × upsell (MAE-P1-01)

| Campo | Conteúdo |
|-------|----------|
| Estado anterior | DeepUpsellHint / deepen / plan upsell podiam aparecer após crise |
| Evidência | chat-service crisis sem marker cliente; chat-panel sempre mostrava upsell |
| Decisão | Emitir `safetyMode: "crisis"`; UI suprime CTAs comerciais |
| Implementação | schema + service + chat-history-ui + chat-panel |
| Testes | crisis-commercial-suppression, crisis-safety, real-usage e2e |
| Commit | `b1855b8` |
| Residual | Marker session-only; refresh DB não restaura (sem schema) |
| Humano/remoto | — |

## Bloco 2 — Docs críticas

| Findings | MAE-P1-02, P1-05, P2-12, P2-13, P2-05 |
| Commit | `6e1ceab` (+ follow-up section 18 em `b36d693`) |
| Residual | — |

## Bloco 3 — Stable codes (MAE-P2-04)

| Commit | `0b2a58a` |
| Códigos | chat/journey expandidos + ops helpers; `feature_temporarily_disabled` no bloco 7 |

## Bloco 4 — Robots (MAE-P2-02)

| Commit | `c21dceb` |
| | `/jornadas` + `/jornada/` disallow |

## Bloco 5 — Financeiro (MAE-P0-02, UG-07)

| Commit | `b36d693` |
| | 12 testes smoke + chargeback playbook |
| Stripe chamado? | **Não** |

## Bloco 6 — MIG 004 pack (MAE-P0-01)

| Commit | `270ac39` |
| SQL executado? | **Não** |
| Migration aplicada? | **Não** |

## Bloco 7 — Kill switches (MAE-P2-07, UG-05)

| Commit | `603012f` |
| Flags | `FEATURE_DISABLE_CHAT/JOURNEYS/DEEPEN` |
| Código | `feature_temporarily_disabled` 503 |
| Env remoto alterado? | **Não** |

## Bloco 8 — Ops (MAE-P1-06, UG-18, UG-20)

| Commit | (este pacote docs) |
| Docs | incident runbooks + access/rotation matrix |

## Bloco 9 — Supply chain (MAE-P1-11)

| Commit | (este pacote docs) |
| Rec | aguardar Next (sharp); aceitar postcss temporário |
| Lockfile | intacto |

## Bloco 10 — Relatório

Este arquivo + NEXT_STEPS atualizado.

---

## Bloqueios restantes (humanos/remotos)

B00 · 005–007 · MIG 004 apply · RLS live · e-mail deliverability · smoke Jornadas · pastoral · financeiro smoke · SHA produção · deploy · jurídico exclusão
