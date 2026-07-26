# Experiência pública — auditoria de conversão

**Data:** 2026-07-26  
**Preços imutáveis:** R$38 / R$58 / R$188  
**Sem depoimentos/números fabricados.** Hipótese vs evidência marcados.  
**Limitação:** padrões “BR mobile-first” / menções a guias tipo RD Station = **referência de mercado (HIPÓTESE)** — sem fetch live nesta execução.

---

## 1. Funil esperado

Instagram / vídeo → landing (`/` ou `/planos`) → cadastro/auth → checkout Stripe → app (`/inicio`).

Bio Instagram → **CTA primário `/planos`**.

## 2. Objetivo por página

| Página | Objetivo único |
|--------|----------------|
| `/` | Credibilidade + desejo + 1 CTA |
| `/planos` | Escolher plano + checkout |
| `/como-funciona` | Reduzir medo de IA / teologia |
| `/ajuda` | Objeções pós-dúvida |
| Auth | Conta sem perder intent |

## 3. Padrões brasileiros relevantes (HIPÓTESE de mercado)

Mobile-first · WhatsApp como suporte **não pastoral** · preço mensal claro em R$ · cancelamento visível · prova social só se real · linguagem direta pt-BR.

## 4. O que a home faz bem (EVIDÊNCIA de produto)

Nome/proposta espiritual · honesty de IA · caminho para planos · sem prometer entitlements reserved.

## 5. O que reduz credibilidade

Copy genérica de “app de bem-estar” · falta de prova real · visual “template IA” · silêncio sobre cancelamento.

## 6. O que reduz desejo

Benefícios abstratos · não mostrar Jornadas/Aprofundar com clareza de plano · hero sobrecarregado.

## 7. O que reduz clareza

Múltiplos CTAs iguais · “em breve” misturado com ativo · jargão técnico.

## 8. O que reduz conversão

Fricção auth antes do valor · checkout sem cupom testado · medo de cobrança sem `/cancelamento` linkado.

## 9. Risco teológico

Soar como “Jesus falando” · promessas sobrenaturais · medicalizar fé.

## 10. Fricção

Cadastro longo · perda de UTM · deep-link quebrado · mobile tap targets.

## 11. Mapa nova home (especificação)

Marca → 1 headline → 1 frase → CTA Planos + secundário Como funciona → prova real (demo/screenshot) — **sem** stats inventados.

## 12. Mapa nova `/planos`

Comparativo Essencial/Caminho/Profundo · Particular separado · FAQ objeções · CTA checkout · link cancelamento.

## 13. Mapa `/como-funciona`

3 passos · o que a IA é/não é · crise/ajuda humana · CTA planos.

## 14. Copy deck (rascunho)

| Peça | Direção |
|------|---------|
| Headline | Reflexão bíblica com IA, com limites honestos |
| Sub | Planos a partir de R$38/mês · cancele a renovação quando quiser |
| CTA | Ver planos |
| Bio IG | Link `/planos` |

## 15–16. Wireframes textuais

Ver `AMEM_PUBLIC_UX_VISUAL_REDESIGN_SPEC_2026-07-26.md` (desktop + mobile).

## 17. Componentes reaproveitáveis

`plan-cards` · FAQ · LegalDocumentShell · honesty banners · CTAs auth deep-link.

## 18. Provas possíveis **sem fabricação**

| Tipo | OK? |
|------|-----|
| Demo / screenshots reais do produto | Sim |
| Transparência IA / limites | Sim |
| Exemplos de Jornada (editorial) | Sim, pastoral |
| Garantia/cancelamento verdadeiro | Sim |
| Números de usuários/conversão | **Só se medidos** — hoje não inventar |
| Depoimentos | **Só reais com consentimento** |

## 19. CTA primário

**Ver planos** → `/planos`.

## 20. CTAs secundários

Como funciona · Entrar · Ajuda · Cancelamento (confiança).

## 21. FAQ de objeções

É Jesus? · Substitui pastor/terapeuta? · Posso cancelar? · O que é Aprofundar? · Jornadas em qual plano? · Dados seguros?

## 22. Eventos analytics necessários

`landing_view` · `planos_view` · `plan_cta_click` · intents já logados · `upgrade_interest_*` existentes — sem conteúdo de chat.

## 23. Métricas de conversão

| Métrica | Nota |
|---------|------|
| Visita → `/planos` | Medir |
| Planos → checkout started | `signup_intents` **REAL** |
| Checkout completed | **REAL** |
| Visit → paid | Só com analytics + intents; **sem taxa inventada** |

## 24. Plano A/B futuro

Headline honesty vs desejo · CTA Planos vs Começar · ordem dos cards — **após** baseline real.

## 25. Ordem de implementação

1. Bio/link `/planos`  
2. Honesty + CTA home  
3. Planos FAQ/cancelamento  
4. Redesign visual (pós-launch preferível)  
5. A/B

## 26. Esforço

| Faixa | Itens |
|-------|-------|
| S | Bio, CTAs, labels |
| M | Copy home/planos |
| L | Redesign visual completo |

## 27. Risco

Teológico · overclaim · redesign atrasar 28/07.

## 28. Critérios de aceite

- CTA primário claro no mobile  
- Preços R$38/58/188 corretos  
- Sem depoimento/número falso  
- Link cancelamento achável  
- IA honesty visível  
- Bio → `/planos`
