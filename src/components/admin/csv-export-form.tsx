"use client";

/**
 * POST-only CSV export trigger. Requires an explicit confirmation before
 * submitting, since the export contains PII (email/display name) even
 * though it is capped and never includes conversation content.
 */
export function CsvExportForm({
  action,
  fields,
}: {
  action: string;
  fields: Array<[string, string]>;
}) {
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "Exportar até 500 usuários filtrados em CSV (contém e-mail/nome, sem conteúdo de conversas)?",
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      method="post"
      onSubmit={onSubmit}
      className="inline-flex"
    >
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-sand-50"
      >
        Exportar CSV (máx. 500)
      </button>
    </form>
  );
}
