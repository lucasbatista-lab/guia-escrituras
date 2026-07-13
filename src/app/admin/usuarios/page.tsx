import Link from "next/link";
import {
  AdminMetricsError,
  getAdminUsers,
} from "@/lib/admin";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    plan?: string;
    status?: string;
    onboarding?: string;
    duplicates?: string;
    past_due?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const q = params.q?.trim() ?? "";
  const planKey =
    params.plan === "essencial" ||
    params.plan === "caminho" ||
    params.plan === "profundo" ||
    params.plan === "particular"
      ? params.plan
      : "any";

  let data;
  try {
    data = await getAdminUsers({
      page,
      pageSize: 25,
      q: q || undefined,
      planKey,
      subscriptionStatus: params.status || "any",
      onboardingCompleted:
        params.onboarding === "yes" || params.onboarding === "no"
          ? params.onboarding
          : "any",
      duplicatesOnly: params.duplicates === "1",
      pastDueOnly: params.past_due === "1",
    });
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (planKey !== "any") qs.set("plan", planKey);
  if (params.status) qs.set("status", params.status);
  if (params.onboarding) qs.set("onboarding", params.onboarding);
  if (params.duplicates === "1") qs.set("duplicates", "1");
  if (params.past_due === "1") qs.set("past_due", "1");

  function pageHref(p: number) {
    const next = new URLSearchParams(qs);
    next.set("page", String(p));
    return `/admin/usuarios?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Usuários</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Busca e filtros server-side. Sem texto de conversas.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="text-ink-soft">Busca (e-mail, nome ou UUID)</span>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Plano</span>
          <select
            name="plan"
            defaultValue={planKey}
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
            defaultValue={params.status ?? "any"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="any">Qualquer</option>
            <option value="active">active</option>
            <option value="trialing">trialing</option>
            <option value="past_due">past_due</option>
            <option value="none">sem assinatura</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Onboarding</span>
          <select
            name="onboarding"
            defaultValue={params.onboarding ?? "any"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="any">Qualquer</option>
            <option value="yes">Concluído</option>
            <option value="no">Pendente</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="duplicates"
            value="1"
            defaultChecked={params.duplicates === "1"}
          />
          Só duplicadas
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="past_due"
            value="1"
            defaultChecked={params.past_due === "1"}
          />
          Só past_due
        </label>
        <button
          type="submit"
          className="rounded-md bg-ink px-3 py-2 text-sm text-sand-50 sm:col-span-2 lg:col-span-3"
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
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
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
                  {user.planKey ?? "—"} · {user.subscriptionStatus ?? "sem assinatura"}
                  {user.hasDuplicateSubscriptions ? " · duplicada" : ""}
                  {user.isPastDue ? " · past_due" : ""}
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
          Total: {data.total} · Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-ink"
            >
              Anterior
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-ink"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
