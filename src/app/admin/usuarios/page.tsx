import Link from "next/link";
import {
  AdminMetricsError,
  buildAdminUserListQuery,
  getAdminUsers,
  parseAdminUserListSearchParams,
  subscriptionStatusLabelPt,
} from "@/lib/admin";

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
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const page = data.page;
  const baseQs = buildAdminUserListQuery(filters);
  const csvHref = `/api/admin/usuarios/export?${baseQs}`;

  function pageHref(p: number) {
    const qs = buildAdminUserListQuery(filters, { page: String(p) });
    return `/admin/usuarios?${qs}`;
  }

  const createdFromValue = filters.createdFrom?.slice(0, 10) ?? "";
  const createdToValue = filters.createdTo?.slice(0, 10) ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Usuários</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Busca e filtros server-side. Sem texto de conversas. Atualizado em{" "}
            {new Date().toLocaleString("pt-BR")}.
          </p>
        </div>
        <a
          href={csvHref}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-sand-50"
        >
          Exportar CSV (máx. 500)
        </a>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          <span className="text-ink-soft">Busca (e-mail, nome ou UUID)</span>
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Plano</span>
          <select
            name="plan"
            defaultValue={filters.planKey ?? "any"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
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
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
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
          <span className="text-ink-soft">Onboarding</span>
          <select
            name="onboarding"
            defaultValue={filters.onboardingCompleted ?? "any"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
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
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Medium (utm_medium)</span>
          <input
            name="utm_medium"
            defaultValue={filters.utmMedium ?? ""}
            placeholder="ex.: cpc, email"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Conteúdo (utm_content)</span>
          <input
            name="utm_content"
            defaultValue={filters.utmContent ?? ""}
            placeholder="ex.: anuncio-a"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Ordenação</span>
          <select
            name="sort"
            defaultValue={filters.sort ?? "created_desc"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="created_desc">Cadastro mais recente</option>
            <option value="created_asc">Cadastro mais antigo</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Cadastro de</span>
          <input
            type="date"
            name="created_from"
            defaultValue={createdFromValue}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Cadastro até</span>
          <input
            type="date"
            name="created_to"
            defaultValue={createdToValue}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Por página</span>
          <select
            name="pageSize"
            defaultValue={String(filters.pageSize ?? 25)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="duplicates"
            value="1"
            defaultChecked={Boolean(filters.duplicatesOnly)}
          />
          Só duplicadas
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="past_due"
            value="1"
            defaultChecked={Boolean(filters.pastDueOnly)}
          />
          Só pagamento em atraso
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="canceling"
            value="1"
            defaultChecked={Boolean(filters.cancelingOnly)}
          />
          Cancelando no fim do período
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="checkout_pending"
            value="1"
            defaultChecked={Boolean(filters.checkoutPendingOnly)}
          />
          Checkout pendente
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-md bg-ink px-3 py-2 text-sm text-sand-50 sm:col-span-2 lg:col-span-3"
        >
          Filtrar
        </button>
      </form>

      {data.rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum usuário encontrado.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.rows.map((user) => (
            <li key={user.userId}>
              <Link
                href={`/admin/usuarios/${user.userId}`}
                className="grid gap-2 rounded-lg border border-border/60 px-3 py-3 hover:bg-sand-50 sm:grid-cols-4"
              >
                <span className="text-ink">
                  {user.displayName ?? "Sem nome"}
                  <span className="mt-0.5 block font-mono text-xs text-ink-soft">
                    {user.email ?? user.userIdMask}
                  </span>
                </span>
                <span className="text-ink-soft">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleString("pt-BR")
                    : "—"}
                  <span className="block text-xs">
                    Onboarding:{" "}
                    {user.onboardingCompleted == null
                      ? "—"
                      : user.onboardingCompleted
                        ? "sim"
                        : "não"}
                  </span>
                </span>
                <span className="text-ink-soft">
                  {user.planKey ?? "—"} ·{" "}
                  {subscriptionStatusLabelPt(user.subscriptionStatus)}
                  {user.hasDuplicateSubscriptions ? " · duplicada" : ""}
                  {user.isPastDue ? " · atraso" : ""}
                </span>
                <span className="text-ink-soft">
                  Uso mês: R${" "}
                  {((user.monthlyUsedBrlCents ?? 0) / 100).toFixed(2)}
                  {user.utmSource ? (
                    <span className="block text-xs">utm: {user.utmSource}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-soft">
          Total: {data.total} · Página {page} de {totalPages} ·{" "}
          {data.pageSize} por página
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1.5 text-ink"
            >
              Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1.5 text-ink"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
