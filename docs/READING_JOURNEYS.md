# Reading Journeys (V1)

Guided editorial journeys for Caminho, Profundo and Particular subscribers.

## Scope

- **3 journeys × 7 steps** — deterministic content in `src/lib/journeys/journeys/`
- **No runtime AI** — opening or completing a step never calls OpenAI
- **Progress** — `public.journey_progress` (see `docs/READING_JOURNEYS_PERSISTENCE.md`)
- **Entitlement** — `reading_journeys` (active); Essencial blocked

## Journeys

| Slug | Title |
|------|-------|
| `ansiedade-confianca` | Ansiedade e confiança |
| `perdao-limites` | Perdão e limites |
| `recomeco-proposito` | Recomeço e propósito |

## Routes

- `/jornadas` — catalog
- `/jornadas/[slug]` — journey overview + progress
- `/jornadas/[slug]/[step]` — step reading
- `/jornada` → redirects to `/jornadas`

Private, `noindex`, not in sitemap.

## Chat integration

`Conversar sobre esta etapa` opens `/conversar?jornada=<slug>&etapa=<stepSlug>`. Prefill is built server-side from the registry only.

## APIs

- `GET /api/journeys/progress`
- `POST /api/journeys/progress/start`
- `POST /api/journeys/progress/complete`
- `POST /api/journeys/progress/reset`
- `POST /api/journeys/events` (catalog/prefill beacons)

## Editorial safety

```bash
pnpm eval:theology:journeys
```

## Adding a journey

1. Create `src/lib/journeys/journeys/<slug>.ts` with exactly 7 steps
2. Register in `src/lib/journeys/registry.ts`
3. Run `pnpm eval:theology:journeys` and full test suite
4. **Human editorial review** before publishing copy changes

## Completion rule

A journey is **completed** only when the progress aggregate has `completedAt` / `isCompleted` (all required steps done). Being on the last step alone must **not** show “Jornada concluída” or the catalog CTA.

## Limitations

- No personal reflection storage
- No admin progress editing
- No plan change from within journeys
- Essencial sees commercial preview only
