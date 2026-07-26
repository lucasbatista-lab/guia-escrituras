# Crisis runtime — revisão de resposta em produção

**Data:** 2026-07-26  
**HEAD tip (origem):** `eda920e` · **produção publicada:** `461736d` · **fixes locais:** pendentes de deploy  
**Escopo:** evidência de falha de interceptação + correção local determinística  
**Números oficiais BR:** CVV **188** · SAMU **192** · Polícia **190** · Disque **100**

---

## 1. Veredito

| Item | Classificação | Nota |
|------|---------------|------|
| Modelo de IA foi chamado na mensagem de crise | **EVIDÊNCIA** | Resposta longa, refs bíblicas, pediu cidade, sem CVV no trecho |
| Detector teve falso negativo (FN) | **EVIDÊNCIA** | Frase “considerando não viver mais” não casou |
| Template short-circuit existe no código | **EVIDÊNCIA** | `detectCrisisMessage` → `buildCrisisAnswer` · `provider=0` · persiste · sem quota BRL |
| Fix local (padrões + template + skip preferDeep) | **EVIDÊNCIA** (código local) | Precisa deploy + reteste sintético em prod |
| Adequação pastoral do template | **HIPÓTESE** até review humano | Ver checklist §6 |

---

## 2. Evidência da resposta em produção

Trecho observado (produção `461736d`):

| Sinal | Interpretação |
|-------|----------------|
| Referências bíblicas / reflexão longa | Comportamento típico do provider, não do template de crise |
| Pediu cidade / localização | Prompt de conversa pastoral — **não** do template BR |
| Frase ambígua (“encerrar essa sensação”) | Não prioriza risco imediato nem ajuda humana |
| Ausência de CVV 188 no excerpt | Template de crise **não** foi o caminho usado |

**Conclusão:** o short-circuit de crise **não disparou**; a mensagem foi tratada como chat normal.

---

## 3. Falso negativo do detector

| Entrada (normalizada) | Esperado | Resultado pré-fix |
|------------------------|----------|-------------------|
| `considerando nao viver mais` | match `suicide` | **FN** |

| Padrão pré-existente | Cobre a frase? |
|----------------------|----------------|
| `nao quero mais viver` | Não |
| `quero morrer` / `suicid` / etc. | Não (nesta frase) |
| `nao viver mais` / `considerando nao viver` | Ausentes pré-fix → **causa do FN** |

**EVIDÊNCIA:** gap de cobertura de família frasal, não falha de wiring do intercept.

---

## 4. Comportamento do short-circuit (código)

Quando `detectCrisisMessage` casa:

| Comportamento | Estado |
|---------------|--------|
| Chama provider OpenAI | Não (`provider` cost = 0) |
| Consome quota BRL de chat | Não |
| Persiste mensagem assistente | Sim |
| `safetyMode: crisis` / modelo `crisis_safety` | Sim |
| Suprime deepen na sessão (fluxo) | Sim (pós-match) |
| Números no template | CVV 188, SAMU 192, Polícia 190, Disque 100 |

---

## 5. Fix local (pendente de deploy)

| Mudança | Motivo |
|---------|--------|
| Expandir padrões (`nao viver mais`, `considerando nao viver`, …) | Fechar FN observado |
| Encurtar / priorizar `buildCrisisAnswer` | Risco imediato primeiro; menos ambiguidade |
| Skip gate `preferDeep` quando crisis preview casa | Evitar caminho deep antes do intercept |

**Não alterar:** preços, prompts gerais de chat, quotas, billing.

Reteste mínimo pós-deploy:

1. Mensagem com “considerando não viver mais” → template com **188** · sem refs bíblicas longas.
2. Mensagem de ansiedade comum → **sem** match (negativo).
3. Confirmar log `crisis_safety_intercept` e ausência de usage OpenAI no turno.

---

## 6. Checklist de revisão humana

| # | Pergunta | Dono |
|---|----------|------|
| 1 | Template prioriza segurança imediata sem medicalizar? | Pastoral + produto |
| 2 | CVV 188 / SAMU 192 / 190 / Disque 100 corretos e suficientes? | Ops (fontes oficiais) |
| 3 | Pedir cidade é **proibido** no caminho de crise? | Produto (sim — template não pede) |
| 4 | Tom respeitoso sem prometer terapia/pastoral? | Pastoral |
| 5 | Reteste sintético em produção após deploy? | Ops |
| 6 | Não expor conteúdo da mensagem de crise em admin/logs amplos? | Segurança |

---

## 7. Relação com lançamento 2026-07-28

**P0.** Deploy do fix + reteste sintético em produção são condição de go. Ver `AMEM_PRELAUNCH_REAL_USAGE_FINDINGS_2026-07-26.md`.
