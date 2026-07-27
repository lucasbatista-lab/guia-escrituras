# Amém Chat — Auditoria final pré-lançamento (2026-07-27)

> **Superseded para estado de lançamento:** em 2026-07-27/28 o veredito passou a **GO** em `8b8a7d1` (MIG 004 aplicada; 012 reconciliada como falso negativo de postcheck; smokes verdes).
> Fonte atual: `docs/_ai/AMEM_LAUNCH_GO_HANDOFF_2026-07-28.md` · `docs/_ai/AMEM_FINAL_RUNTIME_CLOSURE_2026-07-27.md` · `docs/DATABASE.md`.
> O corpo abaixo permanece como snapshot histórico desta auditoria (SHA `8a48cc2`, MIG 004 ainda pendente naquele momento).

**Tipo:** investigação + teste real não destrutivo + revisão de código
**Modo:** sem implementação · sem commit · sem push · sem deploy
**Produção:** `https://amemchat.com.br`
**Conta de teste:** `llucasbbatista@hotmail.com` (senha digitada pelo operador; nunca armazenada)

---

## 1. Veredito executivo

Produção está em **`8a48cc2`**, alinhada a `HEAD`/`origin/main`. Gates automatizados locais estão verdes. Sprint comercial (A–D) está publicada: H1 novo, CTAs, três planos, Caminho destacado, provas estáticas, Particular separado, mobile sem overflow nos viewports testados.

Runtime autenticado na conta de teste (plano **Essencial**, assinatura **Ativa**): chat normal OK; crise interceptada (`safetyMode=crisis`, `provider=mock`, tokens 0, CVV 188, SAMU 192, sem botão Aprofundar); Jornadas honestamente gated; Admin inacessível a usuário comum.

**Não** foi possível runtime-verificar Jornadas/Caminho nem Aprofundar/Profundo nesta conta (entitlement correto impede). MIG **004** permanece não aplicada (risco residual de integridade RLS, conhecido). `pnpm audit --prod` aponta Next **16.2.10** com CVEs high (patch **16.2.11**); bypass de middleware da advisory parece **não aplicável** (app usa `src/proxy.ts`, sem `i18n.locales`), mas DoS/SSRF residual permanece.

**Veredito:** **GO CONDICIONAL** — lançar só com aceite explícito dos resíduos conhecidos + patch Next agendado + smoke humano Caminho/Profundo.

---

## 2. Produção e SHA

| Item | Valor |
|------|--------|
| HEAD local | `8a48cc26f42fda0416705bfad3abe130f25c7147` (`8a48cc2`) |
| origin/main | `8a48cc2` (idêntico) |
| `/api/health` status | `ok` |
| runtime | `production` |
| version | **`8a48cc2`** (match) |
| checks | `supabasePublicEnv: true` |
| `/api/health/db` | `ok` (latência ~0,8s observada) |
| Working tree | `M` CRLF `src/lib/database/repositories/index.ts` · `??` blueprint conversão |
| Diff vs origin/main | vazio (sem commits locais) |

Sprint comercial presente em produção (evidência Playwright):

- H1: “Clareza à luz das Escrituras para o que pesa agora.”
- CTAs “Ver planos” / “Ver um exemplo”
- Essencial / Caminho / Profundo / Particular
- Preços R$ 38 / 58 / 188 na home e `/planos`
- Tagline “Como Jesus…” **ausente** do hero

---

## 3. Escopo realmente observado

| Frente | Método |
|--------|--------|
| Git / inventário rotas / build output | Shell + glob `src/app` |
| Gates | `pnpm` scripts locais |
| Diff comercial `b805530..8a48cc2` | Revisão de código |
| Segurança estática | Código + `pnpm audit --prod` |
| Público / funil / mobile | Playwright (Chrome) em produção |
| Auth / Conta / Chat / Crise / Admin gate | Playwright headed + login manual |
| Admin métricas | Código only (conta não-admin) |
| SQL remoto postcheck 012 campo falso | **Não executado** (sem sessão SQL); inferência documental |
| Pagamento / troca de plano / cancelamento | **Proibido** — não feito |
| Lighthouse numérico | **Não medido** |

---

## 4. Limitações da auditoria

1. Conta de teste = **Essencial** → Jornadas e Aprofundar **não** runtime-verificados nesta sessão.
2. Campo exato do postcheck estrutural 012 (`overall_ok=false`) **não** reconciliado via SQL read-only nesta janela.
3. MIG 004 estado remoto confirmado só por documentação + expectativa do briefing (não por query live).
4. Chat “contaminação pós-crise”: resposta seguinte sem `status` capturado (possível timeout/UI); `safetyMode !== crisis` observado, mas evidência frágil.
5. Performance: overflow/viewport sim; LCP/INP/Lighthouse **não** coletados.
6. A11y: semântica e labels via código/inspeção parcial; sem leitor de tela dedicado.
7. Senha nunca lida/armazenada; cookies/tokens não exportados para o relatório.

---

## 5. Gates automatizados

| Comando | Resultado | Notas |
|---------|-----------|--------|
| `pnpm test:real-usage` | **121 PASS** (~4s) | Baseline OK |
| `pnpm eval:theology:journeys` | **PASS** | 1 arquivo |
| `pnpm eval:theology:ci` | **PASS** | 1 arquivo |
| `pnpm launch:check` | **PASS** | estático; não valida remote envs |
| `pnpm lint` | **0 erros / 5 warnings** | `theology/report.ts` + `runner.ts` disable unused |
| `pnpm test` | **988 PASS** (~40s) | 98 arquivos |
| `pnpm build` | **PASS** | Next 16.2.10; 43 rotas |
| `pnpm smoke:local-runtime` | **PASS** | privado→307; APIs sem sessão 401 |
| Suites direcionadas (crise, marketing, planos, jornadas, security, deepen, help, privacy…) | **164 PASS** | 17 arquivos |
| `pnpm audit --prod` | **FAIL** (13 vulns: 7 high / 6 moderate) | ver §8 / §28 |

Nenhum teste foi alterado para ficar verde.

---

## 6. Inventário de rotas

Classificação a partir de `src/app` + build + probes HTTP.

### Públicas (marketing / legal)

| Rota | Classe | Probe anônimo |
|------|--------|---------------|
| `/` | pública | 200 |
| `/como-funciona` | pública | 200 |
| `/planos` | pública | 200 |
| `/termos` | pública | 200 |
| `/privacidade` | pública | 200 |
| `/transparencia-ia` | pública | 200 |
| `/cancelamento` | pública | 200 |
| `/ajuda` | pública | 200 |
| `/uso-justo` | pública | 200 |
| `/mensagens-personalizadas` | pública (Particular) | 200 |
| `/robots.txt` `/sitemap.xml` | pública | 200 |

### Auth

| Rota | Classe | Probe |
|------|--------|-------|
| `/entrar` `/cadastro` `/recuperar-senha` | auth pública | 200 |
| `/cadastro?plan=essencial\|caminho\|profundo` | auth + intent | 200; preço correto no body |
| `/confira-seu-email` `/email-confirmado` `/redefinir-senha` `/onboarding` | auth | onboarding 307 sem sessão |
| `/auth/confirm` `/auth/callback` | callback | dinâmicas |

### Autenticadas (platform)

| Rota | Classe | Anônimo | Auth Essencial |
|------|--------|---------|----------------|
| `/inicio` `/conversar` `/conversas` `/conta` `/personalizar` | autenticada | 307→entrar | 200 |
| `/jornadas` `/jornadas/[slug]` `/jornadas/[slug]/[step]` | autenticada + entitlement Caminho+ | 307 | 200 + **gate** sem links |
| `/jornada` | autenticada (alias/legacy) | 307 | NÃO visitada runtime |
| `/assinar/continuar` `/assinatura/sucesso` `/assinatura/cancelada` | autenticada / billing UX | 307 | NÃO exercitada (sem pagamento) |

### Admin

| Rota | Classe | Anônimo | User comum |
|------|--------|---------|------------|
| `/admin` + `/usuarios` `/usuarios/[userId]` `/eventos` `/relatorios` `/uso` `/custos` `/aquisicao` `/parceiros` | admin | 307→entrar | redirect → `/inicio` |

### APIs

| Rota | Classe | Probe anônimo |
|------|--------|---------------|
| `/api/health` | API pública | 200 |
| `/api/health/db` | API pública (latência) | 200 |
| `/api/chat` | API autenticada | 401 `unauthenticated` |
| `/api/journeys/progress*` `/events` | API autenticada | 401 |
| `/api/account/export` `/plan-interest` | API autenticada | 401 |
| `/api/usage` | API autenticada | (contrato nos testes) |
| `/api/billing/portal` `/checkout-success` | API autenticada | não abusada |
| `/api/admin/*` `/api/reports/daily` | API admin | 401 |
| `/api/webhooks/stripe` | webhook | `missing_signature` |
| `/api/cron/daily-report` | cron secret | não forçada |

### Sistema

| Rota | Classe |
|------|--------|
| `loading.tsx` / `error.tsx` / `not-found` (app + segmentos) | framework |
| `opengraph-image` / `twitter-image` / `icon` | assets |

---

## 7. Auditoria do diff A–D (`b805530..8a48cc2`)

Commits: `8b950dc` → `51a637c` → `2695925` → `8a48cc2`.

**Sólido:** preços 38/58/188 preservados; Particular fora da grade principal mas presente; provas estáticas sem fetch; sem troca automática falsa; hero sem “Como Jesus…”; mobile `pb`/overflow hardening.

### Achados (tabela)

| ID | Sev | Categoria | Evidência | Rota | Arquivo/linha | Reprodução | Impacto | Recomendação | Esforço | Confiança | Runtime/código |
|----|-----|-----------|-----------|------|---------------|------------|---------|--------------|---------|-----------|----------------|
| C01 | P1 | Conversão | Comparador sempre `href=/cadastro?plan=…`; CTA final de `/planos` idem mesmo com `hasActiveSubscription` | `/planos` | `plan-compare-static.tsx` ~129–135; `planos/page.tsx` ~332–352 | Logado assinante abre `/planos` | Assinante vê caminho de novo checkout | Condicionar a `hasActiveSubscription` → `/conta` | S | Alta | código |
| C02 | P1 | Copy | FAQ Essencial omite Jornadas como diferencial | `/planos` home | `plan-faq.ts` ~30–33 | Ler FAQ “chat completo” | Contradiz narrativa Caminho | Mencionar Jornadas (Caminho+) e Aprofundar (Profundo+) | S | Alta | código |
| C03 | P1 | Honestidade | Colunas “Análise de cenários / Se X→…” | home `/planos` | `deepen-comparison-static.tsx` ~25–45 | Ler prova Aprofundar | Overclaim vs `preferDeep` real | Alinhar a `DEEPEN_FEATURE_SUMMARY` | S | Alta | código |
| C04 | P1 | Copy | “Aprofundar … pode ser cancelado junto com a renovação” | home `/planos` | `deepen-comparison-static.tsx` ~137–140 | Ler rodapé prova | Confunde modo/mensagem com assinatura | Separar cancelamento de renovação vs modo por mensagem | S | Alta | código |
| C05 | P1 | UX Jornadas | `~N min por etapa` usa minutos **desta** etapa | step | `jornadas/.../[step]/page.tsx` ~87–89 | Abrir etapa | Copy imprecisa | `~N min` (esta etapa) | S | Alta | código |
| C06 | P1 | A11y/UX | Jargão “composer” na UI | `/conversar` | `chat-panel.tsx` ~432–435, ~597–599 | Conta Profundo | Linguagem interna | Copy leiga | S | Alta | código |
| C07 | P2 | Legal/confiança | Chip “Cancele quando quiser” vs renovação | `/` | `page.tsx` ~219 | Home | Soft overclaim | “Cancele a renovação…” | S | Alta | código+runtime |
| C08 | P2 | Prova | Preview jornada completed=3 + step=3 | home | `journey-preview-static.tsx` | Ler prova | Estado ilustrativo inconsistente | completed=2+step3 ou 3+step4 | S | Alta | código |
| C09 | P2 | Copy | “espaço para conversas no mês adequado…” | `/uso-justo` | `uso-justo/page.tsx` ~14–15 | Ler | PT quebrado | Reescrever | S | Alta | código |
| C10 | P2 | Catalog | Entitlements reservados ainda em `plans.ts` Profundo | — | `plans.ts` ~60–70 | Diff | Risco futuro de render cru | Manter só em roadmap | M | Alta | código |
| C11 | P3 | Polish | Labels “este tema” vs “esta resposta” | chat/conta | `chat-panel.tsx` | UI | Inconsistência leve | Unificar | S | Alta | código |

Preços e lockfile: **não** alterados nos commits da sprint. `repositories/index.ts` **ausente** do diff.

---

## 8. Segurança

### Conclusões principais

- Proxy (`src/proxy.ts`) + ownership em chat/histórico/export/journeys: sólido.
- Admin: layout + `requireAdminUser` nas APIs; user comum **não** acessa `/admin` (runtime).
- Webhook Stripe exige assinatura; checkout amarra price IDs server-side (código).
- Crisis short-circuit sem provider OpenAI (runtime + testes).
- Headers: HSTS, CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy observados na home.
- **MIG 004 não aplicada:** policies frouxas de insert em `messages`/`usage_events` (doc + migration); app-layer mitiga leitura cruzada, mas integridade/abuso residual.
- **Next 16.2.10:** audit high; bypass middleware da GHSA-6gpp **provavelmente N/A** (`proxy.ts`, sem i18n single-locale); demais CVEs (DoS Server Actions, SSRF, sharp/postcss) = patch urgente.
- Crisis **depois** de budget/burst/rate-limit (`chat-service.ts` ~218–290 → ~377): usuário no limite pode receber 429 em vez do template (P1 segurança pastoral).

### Não comprovado

- Exploit real MIG 004 em produção (não tentado).
- Campo booleano exato do postcheck 012.
- CSRF prático no export admin CSV (hipótese média).
- Conteúdo de conversa vazando em admin (código diz que não; sem sessão admin).

---

## 9. Auth e sessão

| Check | Resultado |
|-------|-----------|
| HTML privado anônimo | 307 → `/entrar?next=…` |
| API sem sessão | 401 JSON |
| Open redirect | `safeNextPath` (código) |
| Cookies | SameSite=lax; Secure em prod (código) |
| Login teste | OK (operador) |
| Logout / multi-aba | NÃO exercitado runtime |
| Draft pós-logout | coberto por testes `composer-draft-privacy` |
| Auth pages `Cache-Control` | mais fraco que platform (P2 código) |

---

## 10. Supabase / RLS / RPCs

| Item | Estado |
|------|--------|
| MIG 009–011 | Documentadas aplicadas; 011 postcheck verde (briefing) |
| MIG 012 | Briefing: aplicada + smoke comportamental true; `DATABASE.md` ainda desatualizado (“não aplicada”) |
| MIG 004 | **Não aplicada** |
| Journey RPCs | INVOKER + grants endurecidos (009–012) |
| Admin client | `server-only` |
| Journey repo service_role | Ownership no app; bypass RLS se bug de `userId` (P2 defesa em profundidade) |

---

## 11. Campo falso do postcheck 012

| Aspecto | Avaliação |
|---------|-----------|
| Evidência nesta auditoria | Structural `overall_ok=false` **não** reexecutado; campo não listado pelo operador |
| Hipótese mais provável | `table_grants_ok` (mesma classe frágil da 010 em `DATABASE.md`) **ou** regex de corpo (`bare_record_alias_absent` / `any_subquery_absent`) |
| Classificação | **Postcheck provavelmente incorreto/brittle** **ou** **divergência documental** — **não bloqueador** se smoke runtime 012 e UI humana de conclusão permanecem verdes |
| Ação | Humano: rerodar SELECT estrutural; anotar booleano; atualizar `DATABASE.md`; **não** criar migration nesta janela |

---

## 12. Chat

| Check | Resultado |
|-------|-----------|
| Envio normal | Runtime **200**, `provider=openai`, resposta substantiva (~3,5k chars), refs bíblicas |
| Follow-up | **200**, ~2,4k |
| Limites/perdão | **200**, resposta específica (snippet pastoral OK) |
| Decisão profissional | **200**, ~4,3k; botão Aprofundar **ausente** (Essencial — correto) |
| Composer | Presente; send habilitado após input real |
| requestId na UI | Não evidenciado como conteúdo visível na captura de body (payload API contém requestId — esperado no JSON, não no bubble) |
| Streaming cancel / refresh mid-stream | NÃO runtime-verificado |
| Incomplete Deep like success | Código: `assertDeepAnswerSubstantive` + `ai_incomplete`; runtime Deep N/A nesta conta |

---

## 13. Crise

Mensagem sintética autorizada enviada em conversa nova.

| Obrigatório | Runtime |
|-------------|---------|
| Template determinístico | Sim (`safetyMode=crisis`) |
| Curto (~829 chars) | Sim |
| CVV 188 | Sim |
| SAMU 192 | Sim |
| Pergunta perigo imediato | Sim (snippet) |
| Não ficar sozinho / pessoa próxima | Sim (template) |
| IA não substitui emergência | Sim |
| Sem “Resposta aprofundada” | Sim |
| Sem upsell comercial | Sim (falso positivo de regex em “um **plano** ou meios”) |
| Sem botão Aprofundar | Sim |
| provider | `mock` |
| tokens | 0 / 0 |
| Contaminação sessão seguinte | Parcial: `notCrisis=true` mas status HTTP não capturado |

**P1:** intercept após rate/budget (código).

---

## 14. Jornadas

| Check | Resultado |
|-------|-----------|
| Catálogo Essencial | Runtime: gate honesto; **0** links de jornada |
| Persistência / reset / conclusão integral | **NÃO runtime nesta conta**; testes + smoke humano prévio (briefing) + MIG 012 smoke |
| Copy “min por etapa” | P1 código (C05) |
| Mobile sticky | Hardening no diff D; overflow home/planos OK |

---

## 15. Aprofundar

| Check | Resultado |
|-------|-----------|
| Gate Essencial | Runtime: botão **não** visível |
| Prefill sem autosend / Deep real | **NÃO runtime** (requer Profundo) |
| Completeness guard | Código + testes `deep-response-on-demand` |
| Marketing overclaim | P1 C03/C04 |

---

## 16. Verdade dos três planos

| Funcionalidade | Essencial | Caminho | Profundo | Promessa pública | Código | Teste | Runtime | Divergência |
|----------------|-----------|---------|----------|------------------|--------|-------|---------|-------------|
| Chat + histórico | sim | sim | sim | sim | `chat_standard` | sim | Essencial OK | — |
| Personalizar | sim | sim | sim | sim | perfil | sim | página 200 | — |
| Jornadas | não | sim | sim | sim | `reading_journeys` | sim | Essencial gated OK | Caminho N/V |
| Aprofundar | não | não | sim | sim | `chat_deep` | sim | botão ausente OK | Profundo N/V |
| Particular | off-grid | — | — | sob solicitação | `request_access` | — | página pública OK | — |
| Preço | 38 | 58 | 188 | sim | `plans.ts` | sim | home/planos OK | — |
| FAQ diferencial | — | — | — | parcial | `plan-faq.ts` | — | — | omite Jornadas (C02) |

Conta observada: **Essencial / Ativa** (evidência `/inicio` “Plano Essencial”; Conta mostra preço 38 e copy de upgrade mencionando Caminho).

---

## 17. Billing / Stripe

Somente leitura de código + ausência de ações proibidas.

- Checkout: plan key + price env map; metadata não é autoridade sole.
- Webhook: signature + idempotência + binding anti-spoof.
- Cancel = `cancel_at_period_end` (código/docs UX).
- **Não** criado checkout, pagamento, portal mutate, cupom.
- Nenhum indício de cobrança errada nos paths revisados.
- MRR admin = catálogo (não caixa Stripe) — rotulado.

---

## 18. Conta e privacidade

Runtime Conta: cancel copy presente; export/Baixar dados presente; status “Ativa”; sem executar export/cancel/reativar.

Código: export usa user da sessão (sem `userId` client); confirmações destrutivas em fluxos sensíveis (revisão prévia/testes).

---

## 19. Admin

| Página | Proteção | Auth comum | Métricas (síntese) |
|--------|----------|------------|--------------------|
| `/admin` | layout `isAdmin` | redirect `/inicio` | REAL counts; MRR **ESTIMATIVA**; receita caixa **NÃO INTEGRADA** |
| usuários / detalhe | + APIs `requireAdminUser` | N/A | PII email no detalhe/CSV |
| eventos | ok | N/A | REAL |
| relatórios | ok | N/A | SNAPSHOT UTC |
| uso / custos | ok | N/A | ESTIMATIVA / alguns DERIVADA **ENGANOSA** (média por cadastrado; percentis all-months) |
| aquisição / parceiros | ok | N/A | REAL/DERIVADA com avisos |

Timezone: “hoje” em UTC — risco operacional (P1/P2).

---

## 20. Público e conversão

Scores (0–10, opinião informada por evidência):

| Dimensão | Nota |
|----------|------|
| Clareza | 8 |
| Estética | 7,5 |
| Confiança | 8 |
| Percepção premium | 7 |
| Mobile | 8 |
| Prova de produto | 8 |
| Planos | 8 |
| Valor Caminho | 8 |
| Justificativa Profundo | 6,5 (overclaim C03) |
| Cadastro | 8 (plan query OK) |
| Produto autenticado Essencial | 8 |
| Admin | 7 (honest labels; TZ/MRR armadilhas) |

Funil IG simulado: home → planos → `cadastro?plan=caminho` preserva query; preços por plan param OK.

---

## 21. Mobile

Viewports 320 / 375 / 390 / 430 / 768 / 1366: H1+CTA visíveis; **sem** horizontal overflow em `/` e `/planos`. Chat testado em 390×844.

---

## 22. Acessibilidade

Problemas comprovados:

- Jargão “composer” (C06).
- Demais: headings presentes nas páginas públicas visitadas; botão Aprofundar usa `aria-pressed` (código).
- Tab order / Escape / zoom 200% / reduced motion: **NÃO** auditados de ponta a ponta.

---

## 23. Performance

| Tipo | Achado |
|------|--------|
| Medido | Home prerender Vercel; HTML ~110KB; health db ~848ms |
| Observado | Páginas públicas sem console errors / 4xx na varredura |
| Inferido | Marketing majoritariamente estático; chat client-heavy |
| Não testado | Lighthouse LCP/CLS/INP |

---

## 24. Erros e resiliência

| Cenário | Base |
|---------|------|
| 401 APIs | Runtime anônimo OK |
| Webhook sem sig | `missing_signature` |
| Kill switches | testes + smoke note |
| Offline / 429 UI / Stripe down | código/testes; não derrubado |
| Crisis vs quota | P1 ordenação |
| Duplo envio / 409 turn lock | código |

---

## 25. Legal / pastoral

| Tema | Classificação |
|------|----------------|
| Não voz divina no hero | OK runtime |
| Cancelamento = renovação (FAQ) | OK; chip home soft (C07) |
| Transparência IA | página 200; link FAQ home pode melhorar |
| Crise / emergência | Runtime OK + P1 quota |
| Dados religiosos / retenção | docs/runbooks existem; não revalidados ponta a ponta |
| MIG/docs drift 012 | risco operacional |

Sem parecer jurídico.

---

## 26. Links quebrados

Varredura de links internos das páginas públicas (até ~14 paths únicos resolvidos): **nenhum** 404/5xx odd (200/307 esperados).
Links autenticados visitados: todos 200.
Admin anônimo: 307.

---

## 27. Dados reais versus mock

| Superfície | Classificação |
|------------|---------------|
| Admin KPIs core | REAL / DERIVADA / ESTIMATIVA rotulada |
| MRR | ESTIMATIVA catálogo |
| Receita Stripe cash | NÃO INTEGRADA |
| Custo IA | ESTIMATIVA planning |
| Relatórios diários | SNAPSHOT UTC |
| Crisis reply | template plataforma (`mock` provider) |
| Provas marketing | estáticas revisadas (não live AI) |
| Chat normal | REAL OpenAI |

---

## 28. P0

| ID | Item | Status |
|----|------|--------|
| P0-SHA | Produção ≠ tip | **Fechado** (match `8a48cc2`) |
| P0-CRISIS-MODEL | Crise chega ao modelo | **Não observado** (intercept OK) |
| P0-ADMIN-BYPASS | Admin user comum | **Não observado** |
| P0-BILLING | Cobrança/plano errado evidenciado | **Não encontrado** |
| P0-MIG004 | RLS insert frouxo (messages/usage_events) | **Aberto conhecido / residual documentado** — não explorado; app-layer mitiga leitura cruzada |
| P0-JOURNEY-500 | `42883` complete RPC | **Não reproduzido**; Essencial gated; smoke 012 prévio |

Nenhum P0 **novo** de vazamento/cross-read/admin bypass/crise→modelo/SHA errado aberto nesta janela.
**MIG 004** permanece o único P0 de confiança de fronteira **conhecido e não aplicado**.

---

## 29. P1 (pré-lançamento)

| ID | Item |
|----|------|
| P1-NEXT | Atualizar Next → **16.2.11+** (audit high; mesmo se bypass middleware N/A) |
| P1-CRISIS-ORDER | Intercept crise **antes** budget/burst/rate-limit |
| P1-C01 | CTAs checkout em `/planos` para assinante |
| P1-C02 | FAQ omite Jornadas |
| P1-C03/C04 | Overclaim / copy cancel Aprofundar |
| P1-C05/C06 | Copy etapa / “composer” |
| P1-ADMIN-TZ | “Hoje” UTC vs Brasília (operacional) |
| P1-DOC-012 | Reconciliar `DATABASE.md` vs 012 aplicada |

---

## 30. P2

C07 chip cancel; C08 preview progresso; C09 uso-justo PT; C10 entitlements reservados; auth HTML cache headers; CSP `unsafe-inline`; journey service_role defense-in-depth; admin métricas derivadas enganosas; `package.json` `"next": "latest"`.

---

## 31. P3

Labels Aprofundar dual; eyebrow brand redundante; preço hardcoded vs formatter; dead ternary plan cards.

---

## 32. Decisões humanas

1. Aceitar lançar com **MIG 004** pendente? (pack existe)
2. Patch **Next 16.2.11** antes do anúncio público ou hotfix D0?
3. Smoke humano em conta **Caminho** (conclusão+reset) e **Profundo** (Deep incompleto→erro honesto)?
4. Corrigir P1 copy comercial antes de mídia paga?
5. Reconciliar postcheck 012 (qual boolean?) e atualizar docs.
6. Trocar senha da conta de teste (exposta em conversa anterior — briefing).

---

## 33. Itens não runtime-verificados

- Jornadas: concluir/persistir/reset/celebração `completedAt` (conta Essencial)
- Aprofundar envio Deep + incomplete handling
- Troca/cancel/reativar/portal Stripe
- Admin páginas com dados (sem role)
- SQL postcheck 012 campo falso
- Lighthouse / INP
- Offline / rede lenta / refresh mid-stream
- Multi-aba logout draft
- Particular provisionado

---

## 34. Top 10 ações pré-lançamento

1. Patch Next **16.2.11** (+ lockfile) e redeploy.
2. Smoke humano Caminho: 1 jornada completa + reset cancel/confirm.
3. Smoke humano Profundo: Aprofundar + forçar/observar incomplete.
4. Decidir MIG 004 (aplicar com pack **ou** aceite escrito do residual).
5. Mover crisis intercept antes de limites comerciais.
6. Corrigir C01–C04 (honestidade/conversão).
7. Anotar booleano postcheck 012 + atualizar `DATABASE.md`.
8. Treinar operador: MRR catálogo ≠ caixa; “hoje” = UTC.
9. Rotacionar senha da conta de teste.
10. Re-checar `/api/health` version pós qualquer deploy.

---

## 35. Estimativa de esforço

| Ação | Esforço |
|------|---------|
| Next patch + verify | M (0,5–1d com QA) |
| Smoke Caminho/Profundo | S (1–2h humano) |
| Crisis order fix | S–M |
| Copy C01–C06 | S (2–4h) |
| MIG 004 apply | M–L + risco (humano) |
| Docs 012 | S |

---

## 36. Ordem exata de execução

1. Decisão humana MIG 004 + janela de patch Next.
2. Smoke Caminho / Profundo (sem mudar código).
3. Se GO mantido: patch Next → deploy → health SHA.
4. Hotfix copy P1 se mídia paga no D0.
5. Crisis order (pode ser hotfix D0/D1).
6. Reconciliar postcheck 012 / docs.
7. Backlog P2/P3 pós-lançamento.

---

## 37. GO / GO CONDICIONAL / NO-GO

### **GO CONDICIONAL**

**Condições para manter GO:**

1. Aceite explícito do residual **MIG 004** **ou** apply controlado antes do anúncio.
2. Patch Next para **≥16.2.11** agendado (idealmente antes de tráfego pago).
3. Smoke humano Caminho + Profundo registrados (esta auditoria não os cobriu em runtime).
4. Produção permanece em tip auditado (ou novo SHA re-auditar health).
5. Nenhum P0 novo de vazamento/crise→modelo/billing no smoke final.

**Por que não GO limpo:** P0 residual MIG 004 aberto; Deep/Jornada não runtime nesta conta; CVEs Next high; P1 crisis-order e copy comercial.

**Por que não NO-GO:** SHA correto; gates verdes; crise comprovada; Essencial coerente; admin gated; billing paths sem anomalia; sprint comercial publicada sem regressão óbvia de preço/CTA principal.

---

## Confirmações de processo

- Nenhum código de produto editado
- Nenhum SQL de escrita
- Nenhum Stripe mutate / pagamento / cancelamento
- Nenhum commit / push / deploy
- Nenhum secret armazenado; senha nunca exibida no relatório
- `repositories/index.ts` intocado
- `pnpm-lock.yaml` intacto no repo
- Único artefato criado: este relatório (não commitado)

---

*Fim do relatório — 2026-07-27*
