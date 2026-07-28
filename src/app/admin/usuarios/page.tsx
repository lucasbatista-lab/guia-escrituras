import Link from "next/link";
import {
  AdminMetricsError,
  ADMIN_TECHNICAL_SEARCH_HINT,
  buildAdminActiveFilterChips,
  buildAdminUserDetailHref,
  buildAdminUserListQuery,
  describeAdminActiveQueue,
  getAdminUsers,
  parseAdminUserListSearchParams,
  subscriptionStatusLabelPt,
} from "@/lib/admin";
import { CsvExportForm } from "@/components/admin/csv-export-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminDataQualityBadge,
  AdminEmptyState,
  AdminFilterSummary,
  AdminOpLink,
} from "@/components/admin/admin-primitives";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseAdminUserListSearchParams(raw);

  let data;
  try {
    data = await getAdminUsers(filters);
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return (
        <AdminEmptyState
          tone="error"
          title="Falha ao carregar usuários"
          description={error.message}
          actionHref="/admin/usuarios"
          actionLabel="Limpar e tentar de novo"
        />
      );
    }
    throw error;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const page = data.page;
  const baseQs = buildAdminUserListQuery(filters);
  const csvExportFields = Array.from(new URLSearchParams(baseQs).entries());
  const activeQueue = describeAdminActiveQueue(filters);
  const filterChips = buildAdminActiveFilterChips(filters);

  function pageHref(p: number) {
    const qs = buildAdminUserListQuery(filters, { page: String(p) });
    return `/admin/usuarios?${qs}`;
  }

  const createdFromValue = filters.createdFrom?.slice(0, 10) ?? "";
  const createdToValue = filters.createdTo?.slice(0, 10) ?? "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Assinantes e produto"
        title="Usuários"
        description="Busca e filtros server-side. Sem texto de conversas."
        meta={`Atualizado em ${new Date().toLocaleString("pt-BR")}.`}
        actions={
          <CsvExportForm
            action="/api/admin/usuarios/export"
            fields={csvExportFields}
          />
        }
      />

      {activeQueue ? (
        <div
          className="rounded-2xl border border-wine/25 bg-gradient-to-br from-wine/[0.05] to-transparent px-4 py-3"
          role="status"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                Fila aberta
              </p>
              <p className="mt-1 font-display text-xl text-ink">
                {activeQueue.name}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {activeQueue.definition}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminOpLink href="/admin">Voltar ao dashboard</AdminOpLink>
              <AdminOpLink href="/admin/usuarios">Trocar de fila</AdminOpLink>
            </div>
          </div>
        </div>
      ) : null}

      <form
        method="get"
        className="space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-ink-soft">Busca operacional</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              placeholder="e-mail, nome, UUID, cus_…, sub_…, requestId"
            />
            <span className="mt-1 block text-xs text-ink-soft">
              {ADMIN_TECHNICAL_SEARCH_HINT}
            </span>
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Plano</span>
            <select
              name="plan"
              defaultValue={filters.planKey ?? "any"}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="any">Qualquer</option>
              <option value="essencial">Essencial</option>
              <option value="caminho">Caminho</option>
              <option value="profundo">Profundo</option>
              <option value="particular">Particular</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Status</span>
            <select
              name="status"
              defaultValue={filters.subscriptionStatus ?? "any"}
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="any">Qualquer</option>
              <option value="active">Ativa</option>
              <option value="trialing">Em teste</option>
              <option value="past_due">Pagamento em atraso</option>
              <option value="canceled">Encerrada</option>
              <option value="none">Sem assinatura</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-ink-soft">Fila operacional</span>
            <select
              name="inactive_days"
              defaultValue={
                filters.inactiveDays ? String(filters.inactiveDays) : ""
              }
              className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Sem filtro de inatividade</option>
              <option value="3">Inativo ≥ 3 dias (contínuos)</option>
              <option value="7">Inativo ≥ 7 dias (contínuos)</option>
              <option value="14">Inativo ≥ 14 dias (contínuos)</option>
              <option value="30">Inativo ≥ 30 dias (contínuos)</option>
            </select>
          </label>
        </div>

        <details className="rounded-xl border border-border/60 bg-sand-50/50 open:bg-card/40">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-h-11 items-center">
              Filtros avançados
            </span>
          </summary>
          <div className="grid gap-3 border-t border-border/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="text-ink-soft">Onboarding</span>
              <select
                name="onboarding"
                defaultValue={filters.onboardingCompleted ?? "any"}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="any">Qualquer</option>
                <option value="yes">Concluído</option>
                <option value="no">Pendente</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Origem (utm_source)</span>
              <input
                name="utm"
                defaultValue={filters.utmSource ?? ""}
                placeholder="ex.: share, google"
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Medium (utm_medium)</span>
              <input
                name="utm_medium"
                defaultValue={filters.utmMedium ?? ""}
                placeholder="ex.: cpc, email"
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Conteúdo (utm_content)</span>
              <input
                name="utm_content"
                defaultValue={filters.utmContent ?? ""}
                placeholder="ex.: anuncio-a"
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Ordenação</span>
              <select
                name="sort"
                defaultValue={filters.sort ?? "created_desc"}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="created_desc">Cadastro mais recente</option>
                <option value="created_asc">Cadastro mais antigo</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Por página</span>
              <select
                name="pageSize"
                defaultValue={String(filters.pageSize ?? 25)}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Cadastro de</span>
              <input
                type="date"
                name="created_from"
                defaultValue={createdFromValue}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Cadastro até</span>
              <input
                type="date"
                name="created_to"
                defaultValue={createdToValue}
                className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm sm:col-span-2 lg:col-span-3">
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="duplicates"
                  value="1"
                  defaultChecked={Boolean(filters.duplicatesOnly)}
                />
                Só duplicadas
              </label>
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="past_due"
                  value="1"
                  defaultChecked={Boolean(filters.pastDueOnly)}
                />
                Só pagamento em atraso
              </label>
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="canceling"
                  value="1"
                  defaultChecked={Boolean(filters.cancelingOnly)}
                />
                Cancelando no fim do período
              </label>
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="checkout_pending"
                  value="1"
                  defaultChecked={Boolean(filters.checkoutPendingOnly)}
                />
                Checkout pendente/parado
              </label>
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="awaiting_confirmation"
                  value="1"
                  defaultChecked={Boolean(filters.awaitingConfirmationOnly)}
                />
                Aguardando confirmação (fluxo de cadastro)
              </label>
              <label className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  name="active_no_conversation"
                  value="1"
                  defaultChecked={Boolean(filters.activeNoConversationOnly)}
                />
                Assinou e nunca conversou
              </label>
            </div>
          </div>
        </details>

        <button
          type="submit"
          className="min-h-11 rounded-md bg-ink px-4 py-2 text-sm text-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Filtrar
        </button>
      </form>

      <AdminFilterSummary
        items={filterChips}
        clearHref={filterChips.length > 0 ? "/admin/usuarios" : undefined}
        resultCount={data.total}
        partial={data.partial}
      />

      {data.partial ? (
        <p className="rounded-lg border border-amber-700/40 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <AdminDataQualityBadge quality="parcial" />
          <span className="ml-2">
            {data.partialReason ??
              "Leitura limitada; não trate o total como completo."}
          </span>
        </p>
      ) : null}
      {data.lookupAmbiguous ? (
        <p className="rounded-lg border border-border/70 bg-sand-50 px-3 py-2 text-sm text-ink-soft">
          Busca técnica ambígua ({data.lookupKind}): múltiplos usuários
          encontrados — revise antes de agir.
        </p>
      ) : null}
      {data.lookupKind && data.total === 0 ? (
        <AdminEmptyState
          tone="filtered"
          title="Nenhum usuário para a busca técnica"
          description={`Tipo: ${data.lookupKind}. IDs são correspondência exata — sem aproximação.`}
          actionHref="/admin/usuarios"
          actionLabel="Limpar busca"
        />
      ) : null}

      {data.rows.length === 0 && !(data.lookupKind && data.total === 0) ? (
        <AdminEmptyState
          tone={filterChips.length > 0 ? "filtered" : "empty"}
          title="Nenhum usuário encontrado"
          description={
            filterChips.length > 0
              ? "Nenhum resultado para os filtros ativos."
              : "Ainda não há usuários para listar."
          }
          actionHref={filterChips.length > 0 ? "/admin/usuarios" : undefined}
          actionLabel={filterChips.length > 0 ? "Limpar filtros" : undefined}
        />
      ) : data.rows.length > 0 ? (
        <>
          {/* Desktop dense table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Lista de usuários do Admin — sem conteúdo de conversas
              </caption>
              <thead>
                <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-2 py-2 font-medium">Assinante</th>
                  <th className="px-2 py-2 font-medium">Plano</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Cadastro</th>
                  <th className="px-2 py-2 font-medium">Uso mês</th>
                  <th className="px-2 py-2 font-medium">Origem</th>
                  <th className="px-2 py-2 font-medium">Flags</th>
                  <th className="px-2 py-2 font-medium">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-border/40 hover:bg-sand-50/80"
                  >
                    <td className="px-2 py-2.5">
                      <span className="font-medium text-ink">
                        {user.displayName ?? "Sem nome"}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-soft">
                        {user.email ?? user.userIdMask}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 capitalize text-ink">
                      {user.planKey ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-ink">
                      {subscriptionStatusLabelPt(user.subscriptionStatus)}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      R${" "}
                      {((user.monthlyUsedBrlCents ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">
                      {user.utmSource ?? "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      <UserFlags
                        duplicate={user.hasDuplicateSubscriptions}
                        pastDue={user.isPastDue}
                        onboarding={user.onboardingCompleted}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Link
                        href={buildAdminUserDetailHref(user.userId, filters)}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile compact cards */}
          <ul className="space-y-2 md:hidden">
            {data.rows.map((user) => (
              <li key={user.userId}>
                <Link
                  href={buildAdminUserDetailHref(user.userId, filters)}
                  className="block rounded-xl border border-border/60 bg-card/60 px-3 py-3 hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {user.displayName ?? "Sem nome"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-soft">
                        {user.email ?? user.userIdMask}
                      </p>
                    </div>
                    <span className="shrink-0 rounded border border-border/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                      {subscriptionStatusLabelPt(user.subscriptionStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className="capitalize">{user.planKey ?? "—"}</span>
                    {" · "}
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                  <div className="mt-2">
                    <UserFlags
                      duplicate={user.hasDuplicateSubscriptions}
                      pastDue={user.isPastDue}
                      onboarding={user.onboardingCompleted}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-ink underline underline-offset-2">
                    Abrir detalhe
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-soft">
          Total: {data.total}
          {data.partial ? " · PARCIAL" : ""} · Página {page} de {totalPages} ·{" "}
          {data.pageSize} por página
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1.5 text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1.5 text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserFlags({
  duplicate,
  pastDue,
  onboarding,
}: {
  duplicate?: boolean;
  pastDue?: boolean;
  onboarding?: boolean | null;
}) {
  const flags: string[] = [];
  if (duplicate) flags.push("duplicada");
  if (pastDue) flags.push("atraso");
  if (onboarding === false) flags.push("onboarding pendente");
  if (flags.length === 0) {
    return <span className="text-xs text-ink-soft">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f}
          className="rounded border border-amber-700/40 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950"
        >
          {f}
        </span>
      ))}
    </span>
  );
}
