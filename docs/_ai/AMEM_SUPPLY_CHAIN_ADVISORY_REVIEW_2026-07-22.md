# Supply Chain Advisory Review — Amém Chat

**Data:** 2026-07-22
**Findings:** MAE-P1-11 · UG-23
**Comando:** `pnpm audit --prod` (read-only; lockfile **não** alterado)
**Fingerprint parcial lockfile (SHA256 prefix):** `4C524DC35B811231` (verificar localmente se necessário)

---

## Advisory 1 — sharp (high)

| Campo | Valor |
|-------|-------|
| Pacote | `sharp` |
| Via | `next` → `sharp` |
| Versões vulneráveis | `<0.35.0` |
| Corrigido em | `>=0.35.0` |
| Advisory | GHSA-f88m-g3jw-g9cj (libvips CVEs listados no audit) |
| Runtime Amém? | **Indireto** — Next pode usar sharp para Image Optimization / OG assets |
| Superfície app | App usa `opengraph-image.tsx` / `icon.tsx` (ImageResponse); não importa `sharp` direto |
| Build vs request | Tipicamente build/edge image pipeline; exposição depende do runtime Vercel/Next |
| Explorabilidade no Amém | **Não provada** nesta revisão — sem PoC; não declarar explorável nem seguro |
| Mitigação atual | Dependência transitiva; sem override |
| Opção upgrade | Aguardar Next que puxe `sharp>=0.35.0` **ou** override consciente (risco regressão Image) |
| Risco regressão | Médio (pipeline de imagens) |
| **Recomendação** | **Aguardar patch do Next** / monitorar release; **não** bump cego do lockfile nesta rodada |

## Advisory 2 — postcss (moderate)

| Campo | Valor |
|-------|-------|
| Pacote | `postcss` |
| Via | `next` → `postcss` |
| Versões vulneráveis | `<8.5.10` |
| Corrigido em | `>=8.5.10` |
| Advisory | GHSA-qx2v-qp2m-jg93 (XSS via unescaped `</style>` em stringify) |
| Runtime Amém? | Principalmente **build/tooling** CSS |
| Explorabilidade | Requer pipeline que stringify CSS com input attacker-controlled — **não evidenciado** no path de usuário Amém |
| **Recomendação** | **Aceitar temporariamente** + acompanhar Next; não override isolado agora |

---

## Confirmações

- `pnpm-lock.yaml` **não** modificado nesta revisão
- Nenhum `pnpm install` / override
- Nenhum upgrade Next executado

## Se upgrade for decidido depois

1. Alvo: Next release que resolva transitivos **ou** override documentado
2. Testes: `pnpm test`, `pnpm build`, smoke OG/icon, `launch:check`
3. Rollback: restaurar lockfile anterior
