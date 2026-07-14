# Configuração de e-mail de autenticação (Supabase)

Após o deploy deste código, a confirmação de cadastro usa **`/auth/confirm`**
com `token_hash` + `type` (SSR via `verifyOtp`), para funcionar também quando o
e-mail é aberto em **outro navegador ou dispositivo**.

A aplicação continua aceitando `/auth/callback` (exchange de `code` / PKCE) para
links antigos e outros fluxos.

## Alteração manual obrigatória no template do Supabase

No **Supabase Dashboard → Authentication → Email Templates → Confirm signup**,
o botão / link de confirmação deve usar o `RedirectTo` enviado pelo app **e**
anexar `token_hash` e `type`:

```html
href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
```

### Por quê?

- `RedirectTo` já aponta para o domínio canônico (`https://amemchat.com.br`)
  com query string, por exemplo:
  - Com plano: `/auth/confirm?intent=<token>&next=/email-confirmado`
  - Sem plano: `/auth/confirm?next=/planos`
- O template precisa acrescentar `&token_hash={{ .TokenHash }}&type=email`
  para a rota `/auth/confirm` criar a sessão no servidor **sem** depender do
  code verifier PKCE do navegador original.

### Redirect URLs no Supabase

Inclua (Site URL + Redirect URLs):

- `https://amemchat.com.br/auth/confirm`
- `https://amemchat.com.br/auth/callback`

Não altere templates remotos a partir deste repositório/deploy automático —
esta alteração é **manual** no Dashboard após o deploy.

Modelos completos (confirmação, recuperação, magic link, alteração de e-mail):
`docs/AUTH_EMAIL_TEMPLATES.md`.

## Checklist rápido

1. Deploy da aplicação com `APP_URL=https://amemchat.com.br`
2. Atualizar template Confirm signup com o `href` acima
3. Confirmar Redirect URLs
4. Testar: cadastro → abrir e-mail em outro navegador → sessão criada →
   `/email-confirmado` → `/assinar/continuar` (com plano) ou `/planos` (sem)

## Segurança

- Nunca coloque e-mail, preço, referral ou UTM no link de confirmação.
- Nunca registre `token_hash`, token do intent ou e-mail completo em logs.
