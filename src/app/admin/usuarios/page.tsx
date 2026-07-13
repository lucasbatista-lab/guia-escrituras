import {
  AdminMetricsError,
  getAdminUsers,
} from "@/lib/admin/metrics";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  let data;
  try {
    data = await getAdminUsers({ page, pageSize: 25 });
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Usuários</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Lista paginada por identificador mascarado — sem nomes, mensagens ou perfil
        espiritual.
      </p>

      {data.rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nenhum usuário cadastrado.</p>
      ) : (
        <ul className="mt-6 space-y-2 text-sm">
          {data.rows.map((user) => (
            <li
              key={user.userIdMask}
              className="grid gap-2 rounded-lg border border-border/60 px-3 py-2 sm:grid-cols-4"
            >
              <span className="font-mono text-ink">{user.userIdMask}</span>
              <span className="text-ink-soft">
                {new Date(user.createdAt).toLocaleDateString("pt-BR")}
              </span>
              <span className="text-ink-soft">{user.planKey ?? "—"}</span>
              <span className="text-ink-soft">
                {user.subscriptionStatus ?? "sem assinatura"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Total: {data.total} · Página {page}
      </p>
    </div>
  );
}
