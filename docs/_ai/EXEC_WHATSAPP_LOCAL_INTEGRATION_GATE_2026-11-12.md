# EXEC — WhatsApp Local Integration Gate (2026-11-12)

Gate de integração local descartável. Sem Meta real, sem banco remoto, sem PR/deploy.

---

## 1. Ambiente local

- Docker Desktop local
- Container descartável: `amem-wa-gate-pg` (`postgres:16-alpine`)
- Bind exclusivo: `127.0.0.1:54329 → 5432`
- Databases: `gate_clean`, `gate_upgrade`
- Bootstrap mínimo: `scripts/whatsapp-local-gate/00_bootstrap_auth.sql` (roles anon/authenticated/service_role + `auth.users` stub)
- SQL gate: `scripts/whatsapp-local-gate/10_sql_integration_tests.sql`
- E2E app-layer: `tests/whatsapp-local-pipeline-gate.test.ts` (transporte fake)

`supabase start` completo não concluiu (pull longo/timeout). Gate usou Postgres local explícito em loopback.

## 2. Prova de banco local (não remoto)

- `docker port amem-wa-gate-pg` → `5432/tcp -> 127.0.0.1:54329`
- Runner recusa host ≠ `127.0.0.1`
- Existe `supabase/.temp/project-ref` remoto legado no worktree — **não usado**
- Nenhum `supabase db push` / `link` / migration remota executado
- Senhas/connection strings não impressas no relatório

## 3. HEAD inicial / final

Inicial: `3ef6369`  
Final: tip após commits deste gate (`git rev-parse HEAD`)

## 4. Commits

1. `fix(whatsapp): harden inbound claim RETURNING assignment`
2. `test(whatsapp): add local database pipeline coverage`
3. `docs(whatsapp): document integration gate`

## 5. Base limpa

Migrations `001` … `021` aplicadas em `gate_clean`: **OK** (`CLEAN_APPLY_ALL_OK` / reapply OK após fix)

## 6. Upgrade incremental

`001`–`018` em `gate_upgrade`, depois `019` → `020` → `021`: **OK**

## 7. Schema

Confirmadas tabelas WhatsApp + PKs/UNIQUEs/CHECKs/índices/leases/`claim_token`/`provider_message_id`/`idempotency_key`.

## 8–10. RLS / Grants / RPCs

- RLS enabled nas 4 tabelas WhatsApp
- `anon`/`authenticated` sem SELECT nas tabelas
- `anon`/`authenticated` sem EXECUTE nas RPCs internas
- `service_role` com privilégios necessários
- `WHATSAPP_SQL_GATE_OK` em `gate_clean` e `gate_upgrade`

## 11–15. Identidade / claim / outbox / status / E2E

SQL gate cobriu link single-use, takeover bloqueado, idempotência inbound/outbound, stale claim_token, status monotônico, revoked não claimável.

Concorrência real (2 sessões):

- inbound claim: exatamente 1 sucesso
- outbound claim: exatamente 1 sucesso

Pipeline E2E fake (Vitest): fluxos 1–7 verdes (vincular, conversa, unlinked, access_required, crise, 429 retry, delivery_unknown) + bloqueio de fetch Graph.

## 16–20. Segurança / correções / testes / baseline

### Correção comprovada

Migration `020`: removido `RETURNING e.id INTO v_ids` inválido (uuid → uuid[]) que quebrava `whatsapp_claim_inbound_bundle` no Postgres real.

### Testes

| Suite | Resultado |
|-------|-----------|
| SQL gate local | OK |
| Concorrência SQL | OK |
| `whatsapp-local-pipeline-gate` | OK |
| Exec 3 / 2 / foundation + targeted | 214 passed |
| Full vitest | **1559 passed / 17 failed preexisting** |

### Baseline

Mesmos 17 testes copy/UX. **NEW FAILURES = 0**

## 21–27. Gates / diff / riscos / staging

- TypeScript: sem erros WhatsApp novos
- Lint touched (TS WhatsApp/tests): clean
- Build: green
- Diff: migration 020 fix + scripts gate + testes + docs (+ `supabase/config.toml` local se presente)

### Riscos remanescentes

- `supabase start` completo ainda não validado neste host (imagens pesadas)
- Staging Meta real ainda não iniciado
- `delivery_unknown` requer reconciliação operacional futura

### Prontidão staging Meta

**Código + schema locais prontos** para staging controlado, desde que o operador:

1. aplique 019–021 no projeto remoto escolhido;
2. configure secrets reais fora do Git;
3. mantenha flags OFF até dry-run;
4. use sender com observação de `delivery_unknown`.

## 28–30. Remote

Push da branch `cursor/whatsapp-channel-foundation` autorizado após gate verde — sem PR/merge/deploy/migration remota.
