import { MOCK_ADMIN_METRICS } from "@/lib/database";

export default function AdminUsuariosPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Usuários</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Sinais anômalos por hash — sem nomes ou mensagens.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {MOCK_ADMIN_METRICS.anomalousUsers.map((user) => (
          <li
            key={user.userIdHash}
            className="flex justify-between rounded-lg border border-border/60 px-3 py-2"
          >
            <span className="font-mono text-ink">{user.userIdHash}</span>
            <span className="text-ink-soft">{user.signal}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">
        Conversões: {MOCK_ADMIN_METRICS.conversions} · Renovações:{" "}
        {MOCK_ADMIN_METRICS.renewals}
      </p>
    </div>
  );
}
