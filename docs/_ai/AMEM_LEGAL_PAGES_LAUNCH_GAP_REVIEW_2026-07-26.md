# Páginas legais — gaps pré-lançamento

**Data:** 2026-07-26  
**Isto não é parecer jurídico.** Gaps + rascunho para advogado.  
**Superfícies:** `/termos` · `/privacidade` · `/cancelamento` · `/uso-justo` · `/transparencia-ia` · marketing/planos

---

## 1. Mapa rápido (produto vs texto)

| Tema | O que o produto faz (EVIDÊNCIA eng.) | Gap típico no texto |
|------|--------------------------------------|---------------------|
| Assinatura recorrente | Stripe monthly; sem trial nesta versão | Detalhar renovação automática e preço |
| Cancelamento | Cancelar renovação na Conta; acesso até fim do período | OK em `/cancelamento`; alinhar Termos |
| Reembolso | Sem proporcional automático salvo lei | Precisa revisão CDC/advogado |
| Troca de plano | Não disponível | Já declarado; atualizar quando D/E existir |
| IA | Não é Jesus/Deus; não substitui profissional | Reforçar limites + crise |
| Dados sensíveis / espiritual | Conversas + perfil | Base legal / categorias LGPD |
| Crise | Template CVV 188 etc. | Termos não detalham intercept |
| Limites / uso justo | Budgets internos | `/uso-justo` vs Termos |
| Menores | Capacidade legal genérica | Idade mínima explícita? |
| Fornecedores | Supabase, Vercel, Stripe, OpenAI | Lista + subprocessadores |
| Retenção / exclusão | Export Conta; exclusão manual suporte | Prazos; ver retention register |
| Cookies / UTM | First-party + campanha | Banner/consentimento se exigido |
| Chargeback | Playbook ops | Não precisa na página pública |
| Jurisdição / contato | Genérico | Endereço/CNPJ/contato DPO? |
| Marketing vs Termos | Preços R$38/58/188 | Consistência; sem promessas reserved entitlements |

---

## 2. Classificação de gaps

### Bloqueadores (revisão counsel antes de GO agressivo)

| Gap | Por quê |
|-----|---------|
| Idade mínima / menores | Risco regulatório se ambíguo |
| Exclusão + retenção com prazos | LGPD + expectativa do usuário |
| Recorrência + preço + cancelamento alinhados Termos↔Conta↔Cancelamento | CDC / transparência |
| Subprocessadores de IA + internacional | Transferência / opacidade |

### Importantes (janela de lançamento)

| Gap | Nota |
|-----|------|
| Reembolso / arrependimento | Copy mínima + counsel |
| Crise / emergência nos Termos | Apontar que há respostas de segurança não-IA |
| Contato / responsável | Canal suporte claro |
| Cookies/UTM | Avaliar necessidade de aviso |

### Pós-lançamento

| Gap | Nota |
|-----|------|
| Plan change (quando existir) | Atualizar Termos + Cancelamento |
| NF / fiscal | Fora do eng |
| Política de afiliados | Se parceiros pagarem comissão |
| i18n legal | Só pt-BR no lançamento |

---

## 3. Rascunho para counsel (working notes)

> Texto provisório — **sujeito a jurídico**. Não publicar como conformidade.

1. Serviço de reflexão com IA; não aconselhamento médico, psicológico, jurídico ou pastoral oficial.  
2. Assinaturas mensais nos preços publicados; renovação automática até cancelar renovação.  
3. Cancelamento: acesso até o fim do período pago; reembolso conforme política aprovada e lei.  
4. Dados: conta, perfil, conversas, uso, campanha; pagamento no Stripe (sem PAN nos nossos servidores).  
5. Em sinais de crise, a plataforma pode responder com recursos oficiais (ex.: CVV 188) sem chamar o modelo.  
6. Exportação em Conta ≠ exclusão; exclusão via suporte com retenções legais de billing.  
7. Fornecedores essenciais processam dados sob contrato.  
8. Contato: [preencher]. Jurisdição: [preencher].

---

## 4. Ações

| Ação | Dono | Antes de 28/07? |
|------|------|-----------------|
| Review Termos+Privacidade+Cancelamento | Jurídico | **Importante** |
| Preencher contato/CNPJ/idade | Negócio + jurídico | Se bloqueador counsel |
| Não expandir copy legal no eng sem mark “rascunho” | Eng | Sim |
