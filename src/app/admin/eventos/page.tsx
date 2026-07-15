import Link from "next/link";
import {
  AdminMetricsError,
  getAdminPaymentEvents,
  paymentProcessingStatusLabelPt,
  type AdminPaymentEventFilter,
} from "@/lib/admin";

function parseFilter(value: string | undefined): AdminPaymentEventFilter {
  if (
    value === "failed" ||
    value === "received" ||
    value === "received_stuck" ||
    value === "processed"
  ) {
    return value;
  }
  return "any";
}

export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);

  let rows;
  try {
    rows = await getAdminPaymentEvents({ filter, limit: 50 });
  } catch (error) {
    if (error instanceof AdminMetricsError) {
      return <p className="text-sm text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const filters: Array<{ key: AdminPaymentEventFilter; label: string }> = [
    { key: "any", label: "Todos" },
    { key: "failed", label: "Failed" },
    { key: "received_stuck", label: "Received presos (>3 min)" },
    { key: "received", label: "Received" },
    { key: "processed", label: "Processed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Eventos de pagamento</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Estados do webhook. Sem payload bruto, sem secrets e sem conteúdo de
          conversas. Atualizado em {new Date().toLocaleString("pt-BR")}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {filters.map((item) => {
          const href =
            item.key === "any"
              ? "/admin/eventos"
              : `/admin/eventos?status=${item.key}`;
          const active = filter === item.key;
          return (
            <Link
              key={item.key}
              href={href}
              className={
                active
                  ? "rounded-md bg-ink px-3 py-1.5 text-sand-50"
                  : "rounded-md border border-border/70 px-3 py-1.5 text-ink hover:bg-sand-50"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum evento neste filtro.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/60 px-3 py-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-ink">{row.eventType || "evento"}</p>
                  <p className="text-ink-soft">
                    {paymentProcessingStatusLabelPt(row.processingStatus)}
                    {row.objectIdMasked ? ` · ${row.objectIdMasked}` : ""}
                  </p>
                </div>
                <div className="text-xs text-ink-soft sm:text-right">
                  <p>Criado: {new Date(row.createdAt).toLocaleString("pt-BR")}</p>
                  <p>
                    Atualizado: {new Date(row.updatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
