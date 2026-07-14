# Templates de e-mail de autenticação (Amém Chat)

Documentação completa dos templates para o **Supabase Dashboard → Authentication →
Email Templates**.

> **Não altere templates remotos a partir deste repositório.** Aplique manualmente
> no Dashboard após o deploy. Ver também `docs/AUTH_EMAIL_SETUP.md`.

**Domínio oficial:** `https://amemchat.com.br`  
**Marca:** Amém Chat  
**Remetente:** configurar no provedor SMTP (ex.: Resend) com o domínio autenticado.

**Suporte no rodapé:** incluir endereço de suporte **somente** se
`NEXT_PUBLIC_SUPPORT_EMAIL` estiver configurado no ambiente. Caso contrário,
omitir a linha de suporte — nunca inventar e-mail.

**P0 antes de billing ao vivo:** configurar `NEXT_PUBLIC_SUPPORT_EMAIL` (e SMTP)
para canais legais e Particular. Sem isso, a UI mostra
“Canal de suporte em configuração” onde aplicável.

---

## Princípios comuns

- Identidade clara: **Amém Chat**
- Título objetivo (assunto + H1)
- **Um botão** principal de ação
- Link de contingência logo abaixo (texto puro, caso o botão falhe)
- Próximo passo explícito
- Aviso de segurança curto
- Domínio oficial no rodapé
- Sem jargão técnico desnecessário no corpo

---

## 1. Confirm signup (Confirmação de cadastro)

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
<!-- Suporte: incluir só se NEXT_PUBLIC_SUPPORT_EMAIL estiver configurado -->
```

### Link obrigatório do botão

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email
```

`RedirectTo` já aponta para `/auth/confirm` no domínio canônico, com `next` (e
`intent` quando houver plano). O template **deve** anexar `token_hash` e `type`.

---

## 2. Reset password (Recuperação de senha)

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
  <a href="{{ .ConfirmationURL }}">Criar nova senha</a>
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .ConfirmationURL }}
</p>
<p>
  <strong>Próximo passo:</strong> defina uma nova senha e entre na sua conta.
</p>
<p>
  Se você não solicitou esta alteração, ignore este e-mail. Sua senha atual
  permanece válida.
</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

---

## 3. Magic Link (Link mágico de acesso)

### Subject

```
Seu link de acesso — Amém Chat
```

### Body (HTML)

```html
<h2>Acesse sua conta</h2>
<p>Olá,</p>
<p>
  Use o botão abaixo para entrar no <strong>Amém Chat</strong> sem digitar a
  senha neste momento.
</p>
<p>
  <a href="{{ .ConfirmationURL }}">Entrar no Amém Chat</a>
</p>
<p>
  Se o botão não funcionar, copie e cole este link no navegador:<br />
  {{ .ConfirmationURL }}
</p>
<p>
  <strong>Próximo passo:</strong> o link abre a sessão na sua conta. Ele é de uso
  único e expira por segurança.
</p>
<p>
  Se você não pediu este acesso, ignore este e-mail.
</p>
<p>Amém Chat · https://amemchat.com.br</p>
```

---

## 4. Change email address (Alteração de e-mail)

### Subject

```
Confirme o novo e-mail — Amém Chat
```

### Body (HTML)

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

---

## Redirect URLs (lembrete)

Inclua no Supabase (Site URL + Redirect URLs):

- `https://amemchat.com.br/auth/confirm`
- `https://amemchat.com.br/auth/callback`

## Domínio e cookies

- Canônico: **https://amemchat.com.br** (apex)
- Cookies de sessão/continuidade **não** devem fixar `Domain=.amemchat.com.br` nem
  `www` — permanecem host-only no apex.
- Redirecionamento externo **www → apex** (`www.amemchat.com.br` →
  `amemchat.com.br`) deve ser configurado no DNS/hosting (fora deste repo).
- `APP_URL` / `NEXT_PUBLIC_APP_URL` devem ser `https://amemchat.com.br` em
  produção. URLs `*.vercel.app` não devem aparecer para clientes.
