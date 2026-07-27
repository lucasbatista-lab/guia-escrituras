# P0 Production Retest — 2026-07-26

**Deploy confirmado:** `2b2fcbf` (`/api/health` production)  
**HEAD local tip desta rodada:** ver git após commits P0-B/P0-C  
**MIG 009:** aplicada · postcheck `overall_ok=true`  
**MIG 004:** não aplicada  
**Stripe live / redesign / plan change:** **não tocados**

---

## Veredito

**NO-GO técnico para lançamento** até:

1. causa remota do 503 de Jornadas identificada nos logs Vercel + correção causal deployada;  
2. deploy dos fixes locais de crise + Deep incompleto;  
3. smoke humano dos três P0 em produção no SHA novo.

---

## P0-A — Jornadas 503

| Campo | Estado |
|-------|--------|
| **Evidência** | Após deploy `2b2fcbf`, `POST /api/journeys/progress/complete` → HTTP 503; UI: “Não foi possível salvar o progresso. Tente de novo.” (stable `persist_failed`). |
| **Causa** | **Não provada.** Ambiente local sem projeto Vercel linkado / sem auth CLI; logs de produção **não acessíveis** nesta execução. Postcheck 009 verde ⇒ **não** atribuir causalmente à MIG 009 sem evento `journey_progress_rpc_failed`. |
| **Correção** | Nenhuma correção causal implementada (proibido especular). |
| **Teste** | Baseline local de persistence permanece; não substitui prova remota. |
| **Commit** | — |
| **Deploy necessário** | Só após correção causal. |
| **Smoke humano** | Ver instrução de logs abaixo + reteste “Marcar como concluída” em ≥3 jornadas. |
| **GO/NO-GO** | **NO-GO** enquanto 503 persistir sem causa. |

### Como o operador localiza o erro na Vercel

1. Vercel → Project Amém Chat → **Logs** (Production).  
2. Janela ~`2026-07-26 23:48–23:59 UTC` (ajustar ao horário real do clique).  
3. Filtros úteis: path `/api/journeys/progress/complete`, status `503`, texto `journey_progress_rpc_failed`.  
4. Copiar **somente** campos seguros: `requestId` (do JSON da resposta do browser, não o de `/api/health`), `op`, `code` (PostgREST/Postgres), `message` sanitizada (já truncada no log), `details` truncado, horário.  
5. **Não** copiar JWT, cookies, `userId` completo, payload com PII, secrets.

Resposta do endpoint já inclui `{ code, message, requestId }` — usar o `requestId` do complete para correlacionar.

---

## P0-B — Crise (falso negativo)

| Campo | Estado |
|-------|--------|
| **Evidência** | Fixture sintética “não continuar vivo” + “não consigo me manter seguro” com Aprofundar → resposta longa com “Resposta aprofundada”, refs e modelo chamado. |
| **Causa** | Detector sem padrões para `nao continuar vivo` / `me manter seguro`; short-circuit de `preferDeep` existia, mas `detectCrisisMessage` retornava false. |
| **Correção** | Ampliar sinais determinísticos + template BR de estabilização; regressão com fixture de produção. |
| **Teste** | `tests/crisis-safety.test.ts` (fixture + preferDeep + provider 0 + custo 0). |
| **Commit** | `fix(safety): close explicit crisis phrasing bypass` |
| **Deploy necessário** | Sim. |
| **Smoke humano** | Enviar fixture sintética equivalente com Aprofundar marcado; esperar resposta curta com 188/192, sem refs bíblicas longas, sem marker Deep. |
| **GO/NO-GO** | Condicional ao deploy + smoke. |

---

## P0-C — Aprofundar incompleto

| Campo | Estado |
|-------|--------|
| **Evidência** | 1/3 testes Deep em prod: intro + footer UI + refs + CTA, **sem** corpo de reflexão; ainda assim sucesso. |
| **Causa** | Modelo/provider devolveu `answer` fino; schema Zod aceita `minLength: 1`; normalizer não inventa corpo; UI adiciona “Resposta aprofundada” client-side (`deepened`). **Não** foi perda no parser/normalizer — incompleto na origem, aceito como sucesso. |
| **Correção** | Guard estrutural pós-normalização em `preferDeep`: rejeita shell sem corpo (`ai_incomplete`), **sem** persistir assistant nem `chat_deep`. Política: erro honesto; **sem** retry silencioso / fallback Standard nesta rodada. |
| **Teste** | `tests/deep-response-completeness.test.ts` |
| **Commit** | `fix(ai): reject or recover incomplete deep responses` |
| **Deploy necessário** | Sim. |
| **Smoke humano** | 3 prompts Deep (perdão; trabalho×família; culpa); incompleto deve falhar com mensagem honesta, não sucesso oco. |
| **GO/NO-GO** | Condicional; oferecer Profundo no lançamento **só** após smoke Deep estável. Decisão: **manter Aprofundar** com guard (não desabilitar preventivamente). |

---

## Fora de escopo (confirmado)

- Stripe live smoke / cupons / preços / webhook / plan change  
- Landing, admin, legal, parceiros  
- MIG 004 / SQL remoto / novas migrations  
