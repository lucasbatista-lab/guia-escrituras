# Deep response — valor e auditoria de runtime

**Data:** 2026-07-26  
**HEAD tip:** `eda920e` · **prod:** `461736d` · **docs-only nesta conclusão de qualidade**  
**Preços imutáveis:** R$38 / R$58 / R$188  
**Escopo:** provar se `preferDeep` altera o runtime; não mudar prompt de produção nesta execução

---

## 1. Veredito

| Pergunta | Resultado | Tipo |
|----------|-----------|------|
| `preferDeep` chega UI → API → chat-service? | Sim | **EVIDÊNCIA** |
| Muda modelo (`OPENAI_MODEL_DEEP`)? | Sim | **EVIDÊNCIA** |
| Muda profundidade de prompt / tokens? | Sim (ex.: 6000 vs 4000) | **EVIDÊNCIA** |
| Exige entitlement `chat_deep`? | Sim | **EVIDÊNCIA** |
| Afeta grounding / featureType? | Sim (`chat_deep` vs `chat_standard`) | **EVIDÊNCIA** |
| Downgrade silencioso de entitlement? | Não encontrado | **EVIDÊNCIA** (ausência) |
| Flag perdida / stale / sobrescrita? | Não encontrado | **EVIDÊNCIA** (ausência) |
| Gap de qualidade percebida | Provável estratégia prompt/modelo, não wiring | **HIPÓTESE** |

**Conclusão:** Aprofundar **não** é “mesmo caminho com outro botão”. O gap de valor percebido, se existir, é de **qualidade de saída**, não de flag perdida.

---

## 2. Matriz Standard × Deep

| Dimensão | Standard | Deep (`preferDeep`) |
|----------|----------|---------------------|
| Entrada UI | turno normal | toggle / affordance Aprofundar |
| Plano | todos com `chat_standard` | Profundo (+ Particular provisionado) |
| Entitlement | `chat_standard` | `chat_deep` |
| Provider | OpenAI (quando configurado) | mesmo provider |
| Model env | `OPENAI_MODEL_DEFAULT` | `OPENAI_MODEL_DEEP` |
| Prompt depth | padrão | profundidade aumentada |
| Token budget (ordem) | ~4000 | ~6000 |
| History / personalização | ativos | ativos (mesma base + profundidade) |
| Grounding / featureType | `chat_standard` | `chat_deep` |
| Persistence | sim | sim (turno) |
| Custo | menor | maior (tokens + modelo) |
| Crise | intercept antes do deep | preferDeep **skipped** se crisis match (fix local) |

---

## 3. Bugs de wiring

| Hipótese | Achado |
|----------|--------|
| Flag não chega ao service | **Não confirmada** |
| Entitlement ignorado / bypass | **Não confirmada** |
| Deep usa mesmo model env | **Não confirmada** (usa `OPENAI_MODEL_DEEP`) |
| Silent downgrade se sem entitlement | **Não** — gate explícito / erro, não deep “falso” |

Nenhuma correção de wiring nesta rodada. Qualquer mudança de prompt deep em prod = decisão de produto + pastoral, **fora** deste pacote docs.

---

## 4. Rubrica de eval sintético (proposta)

Usar fixtures **sintéticas** (sem PII real). Marcar cada item Pass/Fail/Skip.

| Dimensão | Critério |
|----------|----------|
| Diferenciação | Deep ≠ parafrase superficial do standard |
| Escritura | Cites coerentes; sem inventar livro/capítulo |
| Pastoral | Não medicaliza; não promete revelação |
| Utilidade | Resposta acionável / reflexão mais estruturada |
| Comprimento | Mais profunda sem enrolação vazia |
| Segurança | Crise → template, nunca deep |
| Custo | Tokens deep > standard no mesmo tema (ordem de grandeza) |

---

## 5. Review humano proposto

| Passo | Quem | Entrega |
|-------|------|---------|
| 5 temas fixos (dúvida, luto leve, pecado/culpa, vocação, rotina espiritual) | Ops gera standard+deep | Pares lado a lado |
| Rubrica §4 cega (sem saber qual é deep) | Pastoral | Score 1–5 |
| Se deep ≤ standard em ≥3/5 | Produto | Opções: prompt, modelo, copy, ou despriorizar upsell |
| Sem mudar prod sem GO | Eng | Docs only até decisão |

---

## 6. Relação com lançamento

**P0 qualidade deep:** não. **P1 produto:** sim (valor do Profundo).  
Não bloquear 28/07 por redesign de prompt; bloquear só se copy pública **mentir** sobre o que Aprofundar faz (hoje: honestidade comercial alinhada ao código).
