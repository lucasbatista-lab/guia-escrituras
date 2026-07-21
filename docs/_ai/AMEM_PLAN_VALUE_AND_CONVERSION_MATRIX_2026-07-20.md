# Plan Value & Conversion Matrix — 2026-07-20

Matriz de valor percebido vs entrega, para orientar melhorias **sem** alterar billing/Stripe/preços (R$38 / R$58 / R$188).

## Referências externas (aplicação, não cópia)

| Fonte | Data (aprox.) | Aprendizado aplicável |
|-------|---------------|------------------------|
| Stripe Billing docs (subscription UX) | 2026 | Clareza de “o que está incluso agora” vs roadmap; portal self-service |
| Notion / Linear onboarding patterns | 2026 | Um próximo passo dominante pós-login |
| Calm / Headspace (apps bem-estar) | 2026 | Trilhas guiadas + retomada; sem medicalizar |
| ChatGPT Plus / Claude Pro positioning | 2026 | Diferenciar “padrão” vs “mais profundidade sob demanda” com ação explícita |

Hipótese vs evidência: padrões de mercado = **hipótese**; entitlements no repo = **evidência**.

## Matriz (estado atual do código)

| Benefício | Plano | Estado código | Comunicado | Valor user | Custo técnico | Custo ops | Risco teol. | Risco $ | Retenção | Upgrade | Sem billing? |
|-----------|-------|---------------|------------|------------|---------------|-----------|-------------|---------|----------|---------|--------------|
| Chat standard | todos pagos | **Ativo** | Ativo | Alto | — | Baixo | Baixo | Baixo | Alto | — | sim |
| Histórico | todos | **Ativo** | Ativo | Alto | — | Baixo | Baixo | Baixo | Alto | — | sim |
| Jornadas 3×7 | Caminho+ | **Ativo** | Ativo | Alto | Baixo | Editorial | Médio | Baixo | Alto | Ess→Cam | sim |
| Aprofundar | Profundo+ | **Ativo** | Ativo | Alto | Médio (tokens) | Baixo | Baixo | Médio custo AI | Médio | Cam→Pro | sim |
| Uso frequente (budget) | Caminho+ | **Ativo** (config) | Parcial | Médio | — | Baixo | Baixo | Baixo | Médio | sim | sim |
| short_memory | todos | **Ativo** | Implícito | Médio | — | — | — | — | Médio | — | sim |
| extended_memory | Profundo | **Reservado** | upcoming | Alto se real | Alto | Alto | Médio | Alto | Alto | — | **não agora** |
| multiple_personas | Profundo | **Reservado** | upcoming | Médio | Alto | Teol. alto | **Alto** | Médio | Médio | — | **não** |
| voice_responses | Profundo | **Reservado** | upcoming | Médio | Alto | Alto | Médio | Alto | Médio | — | **não** |
| priority_support | Profundo | **Parcial** (mailto) | Vago | Médio | Baixo | Médio | Baixo | Baixo | Médio | — | sim (HC) |
| human_concierge | Particular | **Manual** | Request | Alto | — | Alto | Médio | — | — | — | ops |
| whatsapp_access | Particular | Flag only | upcoming | — | — | — | **WhatsApp pastoral proibido** | — | — | — | **não espiritual** |
| Crisis safety | todos | **Ativo V1** (sprint) | Docs | Crítico | Baixo | Calibragem | Alto se falhar | — | Confiança | — | sim |
| Help Center | todos | **Ativo V1.1** | /ajuda | Médio | Baixo | Baixo | Baixo | Baixo | Médio | — | sim |
| Histórico retenção | todos | **Ativo V1.1** | /conversas | Alto | — | Baixo | Baixo | Baixo | Alto | — | sim |
| Continuidade Jornadas no início | Caminho+ | **Ativo** | /inicio | Alto | Baixo | Baixo | Baixo | Baixo | Alto | Ess→Cam | sim |
| Aprofundar (copy valor) | Profundo+ | **Ativo** | chat | Alto | — | Baixo | Baixo | Médio custo AI | Médio | Cam→Pro | sim |
| Aquisição content admin | ops | **Ativo V1** | /admin/aquisicao | Médio | Baixo | Baixo | — | — | — | — | sim |
| Draft local do composer | todos | **Ativo** (session) | /conversar | Alto | — | Baixo | Baixo | Baixo | Alto | — | sim |
| Resume por idade | todos | **Ativo** | /inicio | Médio | — | Baixo | Baixo | Baixo | Alto | — | sim |
| Etapa concluída Jornadas | Caminho+ | **Ativo V1.1** | /jornadas/.../step | Alto | Baixo | Baixo | Baixo | Baixo | Alto | — | sim |
| Help FAQ search | todos | **Ativo V2** | /ajuda | Médio | Baixo | Baixo | Baixo | Baixo | Médio | — | sim |
| Admin canceling + utm m/c | ops | **Ativo V1.2** | /admin | Médio | Baixo | Baixo | — | — | — | — | sim |

## Candidatos de implementação (sprint) — decisão

| Ideia | Decisão | Motivo |
|-------|---------|--------|
| Help Center & Support Intake | **Feito** (+ V1.1 + V2 search) | M, testável, sem billing, mobile |
| Crisis intercept | **Feito** | P1 segurança |
| Admin mobile | **Feito** (+ attention + V1.2 filters) | Ops |
| Histórico retenção | **Feito** (+ draft/age) | Retorno ao produto |
| Continuidade Jornadas + deepen UX | **Feito** | Valor Caminho/Profundo |
| Aquisição content attribution | **Feito V1** | Admin medium/content filters V1.2 |
| Memória ampliada / personas / áudio | **Adiado** | XL + risco teológico/custo |
| Favoritos de mensagens | Adiado | Precisa schema/migration |
| Novas jornadas editoriais | Adiado | Revisão pastoral humana |
| Troca de plano | **Bloqueado** até smoke financeiro |
| Playwright E2E | **Adiado** | Spike 2026-07-21 — harness insuficiente |
