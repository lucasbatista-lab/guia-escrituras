# Spec visual — experiência pública (sem implementação)

**Data:** 2026-07-26  
**Status:** especificação apenas · **não** implementar redesign antes do lançamento 28/07  
**Preços:** R$38 / R$58 / R$188  
**CTA primário:** `/planos`

---

## Princípios

| Princípio | Aplicação |
|-----------|-----------|
| Uma composição no 1º viewport | Marca + headline + 1 frase + CTAs + 1 âncora visual real |
| Sem cards no hero | Cards só onde há escolha (planos) |
| Mobile-first BR | Polegar: CTA sticky ou logo abaixo da dobra curta |
| Sem prova fabricada | Screenshots/demo reais |
| Honesty | IA ≠ voz divina |

Evitar clusters visuais genéricos (roxo default, cream+terracota clichê, etc.) — seguir identidade Amém já existente se houver tokens; senão definir variáveis claras **na implementação futura**.

---

## Home — wireframe textual

### Desktop

```
[logo Amém]
HEADLINE (1 linha)
sub (1 frase honesty + preço a partir de R$38)
[ Ver planos ]  [ Como funciona ]
--- visual full-bleed: produto real (chat/jornada) ---
seção 2: o que você recebe agora (máx 3 bullets verdadeiros)
seção 3: o que não somos (IA / não emergência)
footer: Termos · Privacidade · Cancelamento · Ajuda
```

### Mobile

```
logo
headline
sub
[ Ver planos ]  (primário full-width)
[ Como funciona ]
visual produto (edge-to-edge)
bullets curtos
footer links
```

**Fora do 1º viewport:** stats, agenda, chips de promo, depoimentos fake.

---

## `/planos` — wireframe

```
título: Escolha seu plano
sub: mensal · cancele a renovação quando quiser
[ Essencial R$38 ] [ Caminho R$58 ] [ Profundo R$188 ]
Particular: bloco separado (contato / sem checkout self-serve)
FAQ objeções (Aprofundar, Jornadas, cancelamento)
link /cancelamento
```

Cards aqui = interação de escolha.

---

## `/como-funciona` — wireframe

```
1. Conta
2. Conversa com limites honestos
3. Jornadas / Aprofundar conforme plano
bloco: crise → ajuda humana (CVV 188…) sem dramatizar marketing
CTA → /planos
```

---

## Motion (futuro)

2–3 motions só: entrada suave do hero copy, highlight CTA, transição de plano selecionado. Sem glow spam.

---

## Critérios de aceite do redesign (quando autorizado)

- Brand legível sem nav  
- Um CTA dominante  
- Preços corretos  
- Contraste acessível  
- Sem números/depoimentos inventados
