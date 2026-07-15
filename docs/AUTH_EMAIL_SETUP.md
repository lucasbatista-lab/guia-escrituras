# Configuração de e-mail de autenticação (Supabase)

Após o deploy deste código:

- **Confirmação de cadastro** e **recuperação de senha** usam **`/auth/confirm`**
  com `token_hash` + `type` (SSR via `verifyOtp`), para funcionar também quando o
  e-mail é aberto em **outro navegador ou dispositivo**.
- `/auth/callback` (exchange de `code` / PKCE) permanece para links antigos e
  compatibilidade.

## Alterações manuais no Supabase Dashboard

### 1. Confirm signup

**Authentication → Email Templates → Confirm signup**

```html
href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
```

`RedirectTo` (enviado pelo app) aponta para o domínio canônico, por exemplo:

- Com plano: `/auth/confirm?intent=<token>&next=/email-confirmado`
- Sem plano: `/auth/confirm?next=/planos`

### 2. Reset password (obrigatório para recuperação cross-browser)

**Authentication → Email Templates → Reset password**

```html
href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery"
```

`RedirectTo` do app: `/auth/confirm?next=/redefinir-senha`

Fluxo no produto:

1. `/recuperar-senha` → e-mail enviado  
2. `/confira-seu-email?mode=recovery`  
3. Link abre `/auth/confirm` (cria sessão no servidor)  
4. `/redefinir-senha` → nova senha  
5. confirmação visual → Entrar no Amém Chat  

### 3. Redirect URLs

Inclua (Site URL + Redirect URLs):

- `https://amemchat.com.br/auth/confirm`
- `https://amemchat.com.br/auth/callback`

### 4. Suporte

Configure `NEXT_PUBLIC_SUPPORT_EMAIL=amemchatbr@gmail.com` em produção para
mostrar o contato nas telas de e-mail/conta. Sem a variável, a UI omite o
endereço (nunca inventa).

## Checklist rápido

1. Deploy com `APP_URL=https://amemchat.com.br`
2. Atualizar templates Confirm signup **e** Reset password com `token_hash`
3. Confirmar Redirect URLs
4. Testar confirmação de cadastro em outro navegador
5. Testar recuperação de senha em outro navegador → `/redefinir-senha`

## Segurança

- Nunca coloque e-mail, preço, referral ou UTM no link de confirmação/recuperação.
- Nunca registre `token_hash`, token do intent ou e-mail completo em logs.

Modelos completos: `docs/AUTH_EMAIL_TEMPLATES.md`.

## P1 — Alteração de e-mail

A alteração de e-mail **não** está disponível na área `/conta` nesta versão
(somente leitura + aviso). Implementação ampla fica como P1.
