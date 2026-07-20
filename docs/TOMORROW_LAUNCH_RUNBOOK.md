# Tomorrow Launch Runbook V1

Operacional e curto. Use este arquivo ao retomar amanhã — não precisa reler o chat.

Base: `https://amemchat.com.br`

---

## A. Estado de retomada

| Item | Valor |
|------|-------|
| Commit / `origin/main` | `7113493` (+ commit de docs desta noite, se já deployado) |
| Produção `/api/health` | Confirmar `version` = SHA do `main` atual |
| Migration Jornadas | `20260712000008_journey_progress.sql` **aplicada** em produção |
| Postcheck preferencial | `supabase/postchecks/20260712000008_journey_progress_postcheck_consolidated.sql` |
| Gates (última noite) | 739 testes, theology journeys/ci, launch:check, lint, build — verdes |
| Feature | Reading Journeys MVP **publicada** (`reading_journeys` ativo) |
| **Ainda não validado manualmente** | Smoke autenticado (Caminho + Essencial); revisão pastoral das 21 etapas |

---

## B. Primeira ação de amanhã

1. Confirmar `/api/health` = SHA do `main`.
2. (Opcional) Rodar o **postcheck consolidado** no SQL Editor (somente leitura; esperar `overall_ok = true`).
3. Executar **smoke autenticado** das Jornadas:
   - Conta **Caminho** (principal)
   - Conta **Essencial** (bloqueio)
   - **Profundo** opcional
   - **Particular** só se já provisionado — senão pular

Não criar conta de cliente real; não chamar OpenAI além do envio explícito no chat (se testar prefill, **não** enviar).

---

## C. Checklist de smoke (≤15 passos)

1. Login **Caminho** → `/inicio` (card Jornadas)
2. Abrir `/jornadas` (3 cards)
3. Abrir `/jornadas/ansiedade-confianca` (inicia progresso)
4. Abrir `/jornadas/ansiedade-confianca/nomear-a-preocupacao`
5. Marcar etapa concluída → refresh → progresso permanece
6. Segunda sessão/dispositivo → mesmo progresso
7. “Conversar sobre esta etapa” → prefill editável, **sem** auto-send / sem `POST /api/chat`
8. Voltar → **Reiniciar jornada** com confirmação → só esta jornada zera; conversas intactas
9. `/conta` → resumo Jornadas + Assinatura intacta
10. Exportar dados → `journeyProgress` presente; sem texto de pergunta/resposta pessoal
11. (Opcional) Admin `/admin/usuarios/[userId]` → contadores; sem conteúdo pessoal
12. Login **Essencial** → `/jornadas` preview + “Comparar planos”
13. Essencial: URL direta da jornada/etapa → redirect `/jornadas` (sem conteúdo integral)
14. Registrar resultado (aprovado / falha + evidência)
15. Parar se qualquer critério de interrupção (seção D)

Detalhe expandido: relatório de smoke READ ONLY da conversa anterior / `docs/READING_JOURNEYS.md`.

---

## D. Critérios de aprovação e interrupção

**Aprovar se:** progresso persiste; prefill sem auto-send; reset isolado; Essencial bloqueado; export ok; sem 500.

**Interromper lançamento se:**

- Qualquer **500** em páginas/APIs de jornadas
- Progresso some após refresh / 2ª sessão
- Essencial acessa etapa completa (vazamento de entitlement)
- Prefill envia automaticamente / OpenAI sem ação do usuário
- Reset afeta outra jornada ou apaga conversas
- Export falha ou vaza dados de outro usuário

---

## E. Evidências a guardar

- Horário (UTC ou local explícito)
- Conta/plano (ex.: “teste-caminho”, não senha)
- URL testada
- Status HTTP (Network)
- Screenshot **somente** se houver problema
- Trecho de erro **sem** segredo / SQL / stack sensível
- Confirmação de `journeyProgress` no export (sem colar conteúdo pessoal)
- Eventos esperados nos logs (se acessíveis): `journey_*` via `journey_operational_event`

---

## F. Ordem dos próximos blocos (após smoke verde)

1. **Admin Mobile Operations V1**
2. Help Center & Support Intake V1
3. Acquisition Content Attribution V1
4. Autonomous Operations Runbook V1
5. Smoke de **pagamento** — e só depois Plan Change & Proration

---

## G. Não iniciar antes do smoke de pagamento

- Troca automática de plano
- Proration
- Mudanças no webhook Stripe
- Alterações amplas de checkout
- Novas promessas comerciais sem funcionalidade real
