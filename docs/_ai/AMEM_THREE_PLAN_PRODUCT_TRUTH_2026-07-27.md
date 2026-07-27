# Três planos — verdade funcional 2026-07-27

**Preços imutáveis nesta janela:** Essencial R$38 · Caminho R$58 · Profundo R$188  
**Particular** fora do lançamento público padrão (request access).  
**Sem** mudança de preço/quota/composição nesta execução.

---

## Matriz resumida

| | Essencial | Caminho | Profundo |
|--|-----------|---------|----------|
| Preço | R$ 38/mês | R$ 58/mês | R$ 188/mês |
| Público | Uso pontual/moderado | Frequência + Jornadas | Uso intenso + Aprofundar |
| Problema | “Preciso refletir com Escrituras agora” | “Quero um caminho guiado e voltar várias vezes” | “Esta situação pede análise mais ampla” |
| Funcionalidade central | Chat cristão personalizado | **Jornadas** | **Aprofundar** |
| Inclui | chat_standard, short_memory, histórico, personalização | + reading_journeys, margem frequente | + chat_deep (+ herda Caminho) |
| Exclui | Jornadas, Aprofundar | Aprofundar | — (não “mais espiritual”) |
| Diferencial perceptível | Clareza e confiabilidade | Progresso em 7 etapas | Resposta mais profunda **substantiva** |
| Estado real | Wiring OK | Wiring OK; **complete RPC quebrada em prod até MIG 010** | Guard incompleto local; UX Aprofundar ainda ambígua |
| GO | Condicional smoke chat | Condicional **apply 010 + smoke Jornadas** | Condicional deploy guard + smoke Deep |

---

## ESSENCIAL — R$ 38

| Campo | Verdade |
|-------|---------|
| Público | Quem começa; situações pontuais |
| Problema resolvido | Levar uma situação real ao chat com orientação bíblica personalizada |
| Central | Conversa cristã personalizada |
| Incluídas | Chat standard; histórico; personalização (tradição/perfil); uso justo base |
| Excluídas | Jornadas; Aprofundar; memória estendida (se não provisionada) |
| Limite | Política de uso justo / orçamento do plano |
| Fluxo principal | Entrar → personalizar → conversar → histórico |
| Custo operacional | Modelo default; grounding curated |
| Risco | CTA que prometa Jornadas/Aprofundar |
| Promessa pública | Reflexões cristãs personalizadas; sem Jornadas/Aprofundar |
| Teste auto | entitlements; real-usage; feature kill chat; deep entitlement block |
| Smoke humano | Chat + histórico + confirmar **sem** Jornadas/Aprofundar ativos |
| **GO** | Sim após smoke autenticado no SHA publicado |

### Provas exigidas

- [ ] Chat normal  
- [ ] Histórico  
- [ ] Personalização  
- [ ] Sem Jornadas (gating)  
- [ ] Sem Aprofundar (gating)  
- [ ] Nenhum CTA enganoso na superfície autenticada principal  

---

## CAMINHO — R$ 58 (oferta estratégica inicial)

| Campo | Verdade |
|-------|---------|
| Público | Frequência semanal; quer estrutura |
| Problema resolvido | Progresso guiado em temas reais + chat base |
| Central | **Jornadas de leitura** |
| Incluídas | Tudo do Essencial comercialmente prometido + catálogo/iniciar/avançar/concluir/reset/prefill chat |
| Excluídas | Aprofundar |
| Limite | Uso justo estendido (entitlement); progress persistente por usuário |
| Fluxo principal | Catálogo → iniciar → 7 etapas → marcar concluída → conversar sobre etapa → concluir jornada → retomar/reset |
| Custo operacional | Baixo (conteúdo editorial + RPC); chat ainda usa IA |
| Risco | **P0:** complete RPC 42883 em produção até MIG 010 |
| Promessa pública | Jornadas guiadas + frequência |
| Teste auto | journey entitlement; persistence memory; API auth; real-usage journey caminho |
| Smoke humano | 3 jornadas: start → mid → final → persist → reset → prefill |
| **GO** | **Não** até apply 010 + postcheck + smoke complete |

### Provas exigidas

- [ ] Catálogo  
- [ ] Iniciar / avançar / concluir / persistir  
- [ ] Conversar sobre etapa  
- [ ] Reset / retomar  
- [ ] Gating Essencial sem acesso  
- [ ] Benefício compreensível na UI  

---

## PROFUNDO — R$ 188

| Campo | Verdade |
|-------|---------|
| Público | Uso intenso; situações complexas |
| Problema resolvido | Análise adicional sob demanda (não “revelação maior”) |
| Central | **Aprofundar** (`preferDeep` / `chat_deep`) |
| Incluídas | Herança Caminho + Aprofundar; entitlements reservados (personas/voz/etc.) podem constar no plano mas **só vender o que está wired** |
| Excluídas | Superioridade espiritual; Deep em crise |
| Limite | Orçamento; kill-switch deepen; guard de completude |
| Fluxo principal | Marcar Aprofundar → enviar → resposta profunda **com corpo** ou erro honesto |
| Custo operacional | Modelo Deep + mais tokens |
| Risco | Resposta oca como sucesso (mitigado localmente); UX checkbox ambígua |
| Promessa pública | Análise mais extensa com contexto, Escrituras e passos — **não** mais santa |
| Teste auto | deep-response-on-demand; deep-response-completeness; crisis+preferDeep |
| Smoke humano | 3 Deep (1 deve rejeitar incompleto se fixture); crise bloqueia Deep |
| **GO** | Condicional deploy `beb0a94`+`5721fcb` + smoke |

### Provas exigidas

- [ ] Herda Jornadas (quando 010 OK)  
- [ ] Aprofundar funciona  
- [ ] Incompleto → erro estável, sem persistir sucesso  
- [ ] Sem superioridade espiritual  
- [ ] Crise bloqueia Deep  
- [ ] Diferenciação clara vs Caminho  

---

## Gaps (não inventar features)

| Gap | Plano | Ação |
|-----|-------|------|
| Complete RPC 42883 | Caminho/Profundo | Apply MIG 010 |
| Crise/Deep fixes não publicados | Profundo | Deploy tip |
| UX Aprofundar ambígua | Profundo | Spec A→B (`AMEM_DEEP_INTERACTION_*`); não bloquear GO se guard+smoke OK |
| Entitlements “upcoming” no Profundo | Profundo | Não prometer voz/personas se não wired |
| Stripe live | Todos | Depois dos P0 |

---

## Condição GO agregada para vender os três

1. Deploy tip com crise + Deep incompleto.  
2. Apply MIG 010 + postcheck `overall_ok`.  
3. Smoke Essencial / Caminho (Jornadas E2E) / Profundo (Deep + crise).  
4. Confirmar `/api/health` SHA = tip.  

**Não GO** se Jornadas complete ainda 503 ou Deep oco aparecer como sucesso.
