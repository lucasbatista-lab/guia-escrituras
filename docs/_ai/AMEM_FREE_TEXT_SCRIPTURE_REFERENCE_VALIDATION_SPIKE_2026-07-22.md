# Spike — Validação de referências bíblicas no texto livre (`answer`)

**Data:** 2026-07-22  
**Finding:** MAE-P1-09  
**HEAD de entrada da rodada:** `880bc2e`  
**Escopo:** investigação + decisão; **sem** alteração de prompt teológico.

---

## Arquitetura atual (evidência)

| Canal | Runtime | Offline eval |
|-------|---------|--------------|
| `biblicalReferences` estruturadas | `filterReferencesToGrounding` — só allow-list recuperada | `classifyBiblicalReferences` |
| Texto livre `answer` | **não** parseado para refs | `extractBiblicalReferencesFromText` + regras críticas |
| Citação literal longa | heurística `answerLooksLikeLiteralUnlicensedQuote` | `detectFalseLiteralCitation` |

Fluxo live: retrieve → JSON schema → identity gate → literal heuristic → **filtro só estruturado** → normalize presentation → persist `content` + `biblical_references`.

Corpus: paráfrases em `corpus-v1.ts` (sem tradução licenciada completa). Canon PT em `validation.ts`. Aliases de livro no detector de eval (`biblical-refs.ts`).

---

## Opções comparadas

### 1. Validação runtime bloqueante

Bloquear/regerar se o texto livre citar ref inexistente ou fora do grounding.

| Prós | Contras |
|------|---------|
| Fecha MAE-P1-09 no produto | Falsos positivos em nomes (“João”), números comuns, abreviações, intervalos |
| | Pode atrasar ou ocultar resposta **segura** (incl. pós-crise se detector vazar) |
| | Custo/latência de retry; risco teológico de silêncio |
| | Exige calibração pastoral + corpus de aliases |

**Falsos positivos:** “João disse…”, “opção 3:1”, datas, “passo 2:1”.  
**Falsos negativos:** paráfrases sem padrão `Livro n:n`, livros apócrifos com grafia próxima.  
**Custo/latência:** +1 geração em falha; risco de loop.  
**Recomendação:** **não** nesta rodada.

### 2. Validação runtime não bloqueante

Detectar divergência; log redigido; UI inalterada ou aviso suave.

| Prós | Contras |
|------|---------|
| Observabilidade sem matar resposta | Sem mitigação imediata ao usuário |
| | Telemetria precisa nunca logar `answer` integral |
| | Ainda depende de regex (mesmos FPs) |

Útil pós-métricas reais; **não** bloqueia lançamento.

### 3. Sanitização (reescrever / remover cites do texto)

| Prós | Contras |
|------|---------|
| — | Altera conteúdo pastoral sem revisão humana |
| | Proibido neste pacote (não reescrever; não inventar tradução) |

**Descartada.**

### 4. Retry automático com instrução extra

| Prós | Contras |
|------|---------|
| Pode corrigir | Custo OpenAI; muda comportamento sem mudança de prompt base aprovada |
| | Mesmos FPs no detector que dispara retry |

**Não nesta rodada** (e requer decisão humana se tocar prompt).

### 5. Telemetria redigida

Contadores: `free_text_ref_invalid_count` sem texto. Depende de detector estável. **Pós-lançamento** com amostragem.

### 6. Somente eval (offline)

Já parcial: `no_fabricated_biblical_refs`, `no_unretrieved_biblical_refs`, `no_false_literal_citation`. Ampliar testes de evidência da lacuna texto×estruturado **sem** alegar prova live.

| Prós | Contras |
|------|---------|
| Determinístico, sem custo live | Não protege produção em tempo real |
| Baixo risco de FP no produto | Mitigação humana ainda necessária |

### 7. Revisão pastoral amostral

Spot-check de threads reais / fixtures críticas após smoke autenticado.

| Prós | Contras |
|------|---------|
| Julgamento teológico real | Não escala; humano |
| Mitigação temporária explícita | Não é evidência de engenharia |

---

## Decisão desta rodada

**Não implementar runtime bloqueante nem sanitização.**

**Motivo:** não há solução pequena, determinística e de baixo falso positivo **sem** novo corpus/licença, sem mudança de schema e sem mudança de prompt — critérios exigidos para implementar agora.

**Caminho adotado:**

1. Spike documentado (este arquivo).
2. Testes offline evidenciando: ref estruturada coerente; free-text divergente/fabricado; números/nomes não viram versículo; detector não loga conteúdo integral.
3. Mitigação temporária: **pastoral spot-check** + harness `pnpm eval:theology:ci` (já cobre free-text fabricado nas fixtures).
4. Pós-lançamento candidato: telemetria redigida (opção 5) ou runtime não bloqueante (opção 2) **após** calibração pastoral do detector.

**Classificação MAE-P1-09:** mitigado por eval + pastoral; **não** resolvido em runtime; **não** bloqueador local de engenharia para cutover se o caminho crítico humano (pastoral) for executado.

---

## Smoke humano residual (pastoral)

- Amostrar respostas com menção inline a livro+capítulo:verso.
- Confirmar que chips/lista estruturada batem com o sentido do texto.
- Qualquer cite inventada no prosa → registrar para futuro detector/telemetria; **não** exigir hotfix de regex pré-lançamento.
