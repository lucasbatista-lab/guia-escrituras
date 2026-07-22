# Templates de e-mail de autenticação (Amém Chat)

Documentação completa dos templates para o **Supabase Dashboard → Authentication →
Email Templates**.

> **Não altere templates remotos a partir deste repositório.** Aplique manualmente
> no Dashboard após o deploy. Ver também `docs/AUTH_EMAIL_SETUP.md`.

**Domínio oficial:** `https://amemchat.com.br`  
**Marca:** Amém Chat  
**Remetente:** configurar no provedor SMTP (ex.: Resend) com o domínio autenticado.

**Suporte no rodapé:** incluir endereço de suporte **somente** se
`NEXT_PUBLIC_SUPPORT_EMAIL` estiver configurado no ambiente (produção esperada:
`amemchatbr@gmail.com`). Caso contrário, omitir a linha de suporte — nunca
inventar e-mail.

**P0 antes de billing ao vivo:** configurar `NEXT_PUBLIC_SUPPORT_EMAIL` (e SMTP)
para canais legais e Particular. Sem isso, a UI omite o endereço onde aplicável.

---

## Princípios comuns

- Identidade clara: **Amém Chat**
- Título objetivo (assunto + H1)
- **Um botão** principal de ação
- Link de contingência logo abaixo (texto puro, caso o botão falhe)
- Próximo passo explícito
- Aviso de segurança curto
- Domínio oficial no rodapé
- Sem jargão técnico no corpo (sem nomes de rotas internas ou mecanismos)

---

## Resumo: token_hash vs ConfirmationURL

| Fluxo | Template no Dashboard | Mecanismo | Redirect esperado no app |
|-------|------------------------|-----------|---------------------------|
| Confirmação de cadastro | `RedirectTo` + `token_hash` + `type=email` | SSR `/auth/confirm` | `/email-confirmado` ou `/planos` |
| Recuperação de senha | `RedirectTo` + `token_hash` + `type=recovery` | SSR `/auth/confirm` | `/redefinir-senha` |
| Magic Link (sem CTA pública) | Preferir `RedirectTo` + `token_hash` + `type=magiclink` | SSR `/auth/confirm` | `next` (ex. `/inicio`) |
| Magic Link legado | `ConfirmationURL` | PKCE `/auth/callback` | Site URL / callback |
| Alteração de e-mail (P1) | `ConfirmationURL` (até o fluxo no app existir) | ver nota P1 | n/a no app hoje |

---

## 1. Confirm signup (Confirmação de cadastro)

**Usa:** `token_hash` (obrigatório)

### Subject

```
Confirme seu e-mail — Amém Chat
```

### Body (HTML)

```html
<h2>Confirme seu e-mail</h2>
<p>Olá,</p>
<p>
  Você criou uma conta no <strong>Amém Chat</strong>. Confirme seu e-mail para
  continuar com segurança.
</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
    >Confirmar meu e-mail</a
  >
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
</p>
<p>
  <strong>Próximo passo:</strong> depois da confirmação, você conclui o pagamento
  (se já escolheu um plano) ou escolhe um plano para começar.
</p>
<p>
  Se você não criou esta conta, ignore este e-mail. Ninguém terá acesso sem a
  confirmação.
</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

### Link obrigatório

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

---

## 2. Reset password (Recuperação de senha)

**Usa:** `token_hash` (obrigatório para outro navegador)

### Subject

```
Redefinir sua senha — Amém Chat
```

### Body (HTML)

```html
<h2>Redefinir sua senha</h2>
<p>Olá,</p>
<p>
  Recebemos um pedido para redefinir a senha da sua conta no
  <strong>Amém Chat</strong>.
</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery"
    >Criar nova senha</a
  >
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
</p>
<p>
  <strong>Próximo passo:</strong> defina uma nova senha e continue no Amém Chat.
</p>
<p>
  Se você não solicitou esta alteração, ignore este e-mail. Sua senha atual
  permanece válida.
</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

### Link obrigatório

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery
```

`RedirectTo` do app: `https://amemchat.com.br/auth/confirm?next=%2Fredefinir-senha`

> Não use apenas `{{ .ConfirmationURL }}` neste fluxo: isso depende de PKCE e
> falha quando o e-mail é aberto em outro navegador.

---

## 3. Magic Link (Link mágico de acesso)

**Estado no produto:** sem CTA pública de login. A rota `/auth/confirm` aceita
`type=magiclink` se o template/envio for configurado no futuro.

### Preferido (token_hash / SSR)

Configure o envio com `emailRedirectTo` apontando para
`/auth/confirm?next=/inicio` e no template:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink
```

### Subject

```
Seu link de acesso — Amém Chat
```

### Body (HTML) — preferido

```html
<h2>Acesse sua conta</h2>
<p>Olá,</p>
<p>
  Use o botão abaixo para entrar no <strong>Amém Chat</strong> sem digitar a
  senha neste momento.
</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink"
    >Entrar no Amém Chat</a
  >
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink
</p>
<p>
  <strong>Próximo passo:</strong> o link abre sua sessão. Ele é de uso único e
  expira por segurança.
</p>
<p>Se você não pediu este acesso, ignore este e-mail.</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

### Legado (ConfirmationURL / PKCE)

Somente se o envio não definir `RedirectTo` para `/auth/confirm`:

```
{{ .ConfirmationURL }}
```

Esse caminho usa `/auth/callback` e **não** é confiável em outro navegador.

---

## 4. Change email address (Alteração de e-mail) — P1

**Estado no produto:** alteração de e-mail **não** está exposta em `/conta`
(somente leitura + aviso). Não ative expectativa na UI até o fluxo existir.

Enquanto o app não enviar alteração de e-mail, o template pode permanecer com
`ConfirmationURL` para referência futura:

### Subject

```
Confirme o novo e-mail — Amém Chat
```

### Body (HTML) — referência

```html
<h2>Confirme o novo e-mail</h2>
<p>Olá,</p>
<p>
  Foi solicitada a alteração do e-mail da sua conta no
  <strong>Amém Chat</strong>. Confirme o novo endereço para concluir a mudança.
</p>
<p>
  <a href="{{ .ConfirmationURL }}">Confirmar novo e-mail</a>
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .ConfirmationURL }}
</p>
<p>
  <strong>Próximo passo:</strong> após a confirmação, use o novo e-mail para
  entrar.
</p>
<p>
  Se você não solicitou esta alteração, ignore este e-mail e continue com o
  endereço atual.
</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

Quando o fluxo for implementado (P1), migrar para o mesmo padrão SSR:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email_change
```

---

## Redirect URLs (lembrete)

Inclua no Supabase (Site URL + Redirect URLs):

- `https://amemchat.com.br/auth/confirm`
- `https://amemchat.com.br/auth/callback`

## Domínio e cookies

- Canônico: **https://amemchat.com.br** (apex)
- Em **Vercel Production** (`VERCEL_ENV=production`), cookies de sessão usam
  `Domain=.amemchat.com.br` de propósito (`src/lib/supabase/auth-cookie-options.ts`)
  para sobreviver apex ↔ www antes do redirect. Local e preview **não** aplicam
  esse Domain (permanecem host-only).
- **Não** alterar para host-only em produção sem nova decisão arquitetural —
  isso quebraria continuidade de sessão entre www e apex.
- Redirecionamento externo **www → apex** deve estar ativo no hosting
  (código + DNS/hosting).
- `APP_URL` / `NEXT_PUBLIC_APP_URL` devem ser `https://amemchat.com.br` em
  produção. URLs `*.vercel.app` não devem aparecer para clientes.
