# Ops Incident Runbooks Minimal — Amém Chat

**Data:** 2026-07-22
**Findings:** MAE-P1-06 · UG-20 · relacionados MAE-P1-10, UG-02, UG-03

Não prometer SLA inexistente. Não colar conteúdo espiritual em tickets públicos.

Para cada cenário: sintoma → severidade → detectar → evidência → dados proibidos → 1ª ação → quem → limite → kill switch? → bloquear launch? → escalonamento → recuperação → validação → comunicação → relacionados.

---

### 1. Pagou e não recebeu plano
**Sev:** Alta · **Detectar:** sucesso processing infinito; admin sem sub · **Evidência:** Stripe charge + webhook logs · **Proibido:** PAN · **1ª:** verificar webhook/secret/mode · **Quem:** Ops+Fin · **Kill:** não · **Launch:** sim se sistêmico · **Rel:** financial smoke

### 2. Recebeu plano sem pagar
**Sev:** Crítica · **Detectar:** sub active sem invoice paga · **1ª:** revogar entitlement manual; auditar binding · **Launch:** sim · **Rel:** MIG004/forge

### 3. Cobrança duplicada
**Sev:** Alta · **1ª:** confirmar charges Stripe; refund duplicata · **Rel:** chargeback playbook

### 4. Webhook atrasado
**Sev:** Média · **Detectar:** processing > poucos min · **1ª:** Stripe dashboard retries; health não prova billing · **Kill:** não

### 5. Login não funciona
**Sev:** Alta · **Detectar:** usuários sem sessão · **1ª:** Supabase Auth status; cookies Domain; www→apex · **Rel:** AUTH_EMAIL_TEMPLATES

### 6–7. E-mail confirmação / reset não chega
**Sev:** Alta · **Detectar:** bounce/spam · **1ª:** SMTP Resend/Supabase; SPF/DKIM checklist · **Launch:** sim se massivo · **Rel:** UG-03

### 8. Conversa desapareceu
**Sev:** Média · **Detectar:** 404 conversation_not_found · **1ª:** histórico; não acusar usuário · **Proibido:** dump de mensagens em Slack público

### 9. Resposta inadequada
**Sev:** Alta teológica · **1ª:** requestId; NÃO colar answer espiritual em ticket amplo; pastoral · **Kill deepen/chat** se padrão · **Rel:** theology

### 10. Crise mal tratada
**Sev:** Crítica · **1ª:** verificar intercept; se falhou, kill chat; pastoral+humano · **Launch:** sim

### 11. Conteúdo pessoal no admin
**Sev:** Crítica privacidade · **1ª:** conter acesso; redaction audit; jurídico · **Launch:** sim

### 12. UTM não atribuída
**Sev:** Baixa · **1ª:** cookies acquisition; apex/www · **Launch:** não

### 13. Cron diário não executou
**Sev:** Média · **Detectar:** admin alerta relatório ausente · **1ª:** CRON_SECRET; Vercel cron; generate manual

### 14. Custo de IA disparou
**Sev:** Alta · **1ª:** `FEATURE_DISABLE_CHAT` e/ou `FEATURE_DISABLE_DEEPEN`; investigar abuse · **Kill:** sim

### 15. Jornada não salva
**Sev:** Alta · **1ª:** APIs progress; 008; kill journeys se corrupção · **Rel:** human smoke

### 16. Usuário cancela
**Sev:** Baixa · **1ª:** portal / cancel_at_period_end; honesty de acesso até period end

### 17. Quer mudar de plano
**Sev:** Baixa · **1ª:** informar indisponível; não proration · **Rel:** COMMERCIAL_PLANS

### 18. Pede exclusão
**Sev:** Alta LGPD · **1ª:** runbook manual `AMEM_MANUAL_ACCOUNT_DELETION_AND_RETENTION_RUNBOOK_2026-07-22.md` (+ export portabilidade); jurídico via `AMEM_DATA_RETENTION_DECISION_REGISTER_2026-07-22.md` · **Rel:** USER_DATA_PORTABILITY · **Não:** self-service delete automático

### 19. WhatsApp esperando pastoral
**Sev:** Média reputação · **1ª:** redirecionar para ajuda/emergência humana; **não** aconselhar · **Rel:** Particular honesty

### 20. SHA produção divergente
**Sev:** Alta · **Detectar:** `/api/health` version ≠ tip lançamento · **1ª:** não declarar ready; redeploy ou aceitar tip

### 21. Migration local ≠ remota
**Sev:** Alta · **1ª:** B00; pacote MIG 004; **não** apply automático

### 22. www/apex sessão inconsistente
**Sev:** Média · **1ª:** confirmar Domain=.amemchat.com.br em Vercel Production; redirect www→apex · **Não** “corrigir” para host-only

### 23. Service role / secret vazado
**Sev:** Crítica · **1ª:** rotacionar imediatamente (matriz acessos); invalidar; audit · **Launch:** sim

### 24. Conta admin comprometida
**Sev:** Crítica · **1ª:** remover admin_roles; reset Auth; MFA futuro · **Rel:** access matrix

### 25. Acionar kill switch
**Sev:** conforme incidente · **1ª:** set env + redeploy; validar 503 `feature_temporarily_disabled`; comunicar manutenção · **Rel:** DEPLOYMENT.md

---

## Comunicação curta (templates)

**Indisponibilidade:** “Estamos em manutenção operacional temporária. Histórico e ajuda seguem disponíveis.”
**Pagamento:** “Estamos verificando sua assinatura com o processador. Não compartilhe dados do cartão neste canal.”
**Login:** “Se o e-mail não chegou, verifique spam; tente recuperar senha. Se persistir, responda com horário aproximado (sem senhas).”
**Privacidade:** “Recebemos seu relato. Não encaminhe conteúdos sensíveis em cópia ampla; trataremos pelo canal seguro.”
**IA inadequada:** “Obrigado pelo alerta. Vamos revisar com o time. Para crise imediata, use os canais humanos de emergência.”
**Manutenção emergencial:** “Desativamos temporariamente [chat/Jornadas/Aprofundar] para proteger a experiência.”
