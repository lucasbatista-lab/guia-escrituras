# Deep interaction and value — spec 2026-07-27

**Status:** decisão de produto + plano curto · **sem** implementação ampla nesta execução  
**HEAD tip local:** pós-fixes crise/Deep incompleto  
**Produção no início da rodada:** `2b2fcbf` (fixes ainda não publicados)

---

## 1. Fluxo atual (mapa)

| Ponto | Comportamento |
|-------|----------------|
| Onde aparece | Checkbox no **composer** (`chat-panel`), acima do textarea, só se `canDeepen` (Profundo/Particular) e feature deepen ligada |
| Rótulo | “Aprofundar esta resposta” |
| Mensagem enviada | O texto **atual do composer** (`preferDeep: true`) |
| Pergunta original | **Não** é reenviada como campo separado — só o texto digitado agora |
| Resposta anterior | Entra só via **histórico** recente + summary (memória), não como “alvo de aprofundamento” explícito |
| O que `preferDeep` faz | Entitlement `chat_deep` → `responseDepth: deep` → modelo Deep + guidance de profundidade; **não** muda schema de payload |
| Aspecto a aprofundar | **Não** há escolha (contexto bíblico / aplicação / tensões / passos) |
| Conversas longas | Context window limitada (`RECENT_CONTEXT_MESSAGE_LIMIT`); risco de perder o fio se o usuário não reescrever o foco |
| Sucesso incompleto (pré-5721fcb) | Intro + footer UI “Resposta aprofundada” + refs + CTA sem corpo |
| Pós-5721fcb | Guard estrutural rejeita shell oco com `ai_incomplete` antes de persistir/`chat_deep` |
| Crise | `detectCrisisMessage` short-circuit **antes** de Deep entitlement/provider; nunca chega ao guard Deep |

Payload atual:

```json
{
  "message": "<texto do composer>",
  "conversationId": "...",
  "personaKey": "jesus",
  "requestId": "...",
  "preferDeep": true
}
```

---

## 2. Falhas atuais de UX/valor

1. Checkbox **antes** de escrever sugere “mais espiritualidade”, não “análise adicional desta situação”.  
2. Rótulo “esta resposta” sugere aprofundar a **última** resposta, mas o runtime aprofunda a **próxima mensagem digitada**.  
3. Usuário não indica o **aspecto** (bíblico / prático / tensões / passos).  
4. Valor depende do modelo gerar corpo completo; incompleto agora falha honestamente (bom), mas a fricção permanece.  
5. Upsell em planos sem Deep ainda compete com clareza do Essencial/Caminho se copy for agressiva (fora do escopo de redesign).

---

## 3. Alternativas avaliadas

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **A** Botão sob resposta: “Aprofundar esta resposta” | Intuição correta; parte de conteúdo existente | Precisa payload com assistant id / texto | **Recomendada (fase 1)** |
| **B** Painel “O que aprofundar?” | Clareza de valor; orientação opcional | Mais UI/estado | **Fase 2** sobre A |
| **C** Pedido estruturado automático | Menos digitação | Risco de prompt longo / custo | Fase 2–3 |
| **D** Manter toggle + copy | Zero schema | Continua ambíguo | Só paliativo |

**Recomendação:** **A → B** em blocos curtos. Não implementar arquitetura ampla sem decisão de release.

---

## 4. Wireframe textual (fase 1+2)

```
[Resposta do assistente]
  Referências · …
  [ Aprofundar esta reflexão ]

── painel (fase 2) ─────────────────────────
O que você gostaria de aprofundar?
( ) Contexto bíblico
( ) Aplicação prática
( ) Tensões e perspectivas
( ) Próximos passos
Orientação opcional: [____________________]
[ Cancelar ]  [ Aprofundar ]
────────────────────────────────────────────
Explicação: análise adicional desta conversa —
não é uma resposta “mais espiritual”.
```

---

## 5. Payload alvo (fase 1 — se aprovado)

Sem billing/schema de DB; campos opcionais no request existente **somente se** o schema Zod já puder estender de forma backward-compatible.

Mínimo desejado (futuro):

```ts
{
  message: string;              // foco do usuário OU orientação
  preferDeep: true;
  deepenFromMessageId?: string; // assistant alvo
  deepenAspect?: "biblical" | "application" | "tensions" | "next_steps";
}
```

Runtime monta prompt interno com: pergunta relevante + resposta anterior + orientação.  
**Esta execução:** docs only — schema atual **não** alterado.

---

## 6. Estado / a11y / mobile / erros

| Tema | Requisito |
|------|-----------|
| Estado | Painel fechado por padrão; um aprofundamento por vez; desmarcar/cancelar limpa |
| A11y | Botão com nome acessível; painel `dialog` ou `region`; foco retorna à resposta |
| Mobile | Painel full-width abaixo da resposta; CTA ≥ 44px; sem overlay opaco no teclado |
| Erros | `ai_incomplete` / timeout: mensagem honesta; draft preservado; chat utilizável; **sem** fallback Standard silencioso |
| Qualidade | Corpo com acolhimento + reflexão + aplicação; refs coerentes; sem superioridade espiritual |

---

## 7. Critérios de aceite (produto)

- [ ] Aprofundar parte de uma resposta já recebida (não de checkbox abstrato).  
- [ ] Usuário pode indicar aspecto (fase 2) ou orientação textual.  
- [ ] Incompleto nunca mostra “Resposta aprofundada” como sucesso.  
- [ ] Crise bloqueia Deep.  
- [ ] Essencial/Caminho não veem controle ativo (só upsell honesto, se houver).  
- [ ] Smoke: 3 prompts Deep; 1 incompleto sintético rejeitado.

---

## 8. Plano de implementação (blocos curtos)

1. **Já feito:** guard de completude (`5721fcb`).  
2. **Deploy + smoke** do guard em produção.  
3. **Decisão humana:** A vs D paliativo.  
4. **Bloco UI A** (botão sob mensagem) + prefill composer com pedido contextual — se schema permitir sem migração.  
5. **Bloco B** painel de aspectos.  
6. **Prompt review** só com evidência + revisão humana (fora desta execução).

**Decisão desta execução:** **não** implementar A/B agora (precisaria mudança de interação + possível extensão de schema). Manter toggle D com copy atual já melhorada + guard de completude.
