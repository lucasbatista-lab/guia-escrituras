"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction } from "@/lib/auth/update-password-action";

export function UpdatePasswordForm({
  supportEmail,
}: {
  supportEmail: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await updatePasswordAction({ password, confirmPassword });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <p className="text-xs text-ink-soft">
        Use pelo menos 8 caracteres, com letras e números.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full bg-ink hover:bg-ink/90"
        disabled={loading}
      >
        {loading ? "Salvando…" : "Salvar nova senha"}
      </Button>
      {supportEmail ? (
        <p className="text-center text-xs text-ink-soft">
          Precisa de ajuda?{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="text-ink underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      ) : null}
      <p className="text-center text-sm text-ink-soft">
        <Link
          href="/recuperar-senha"
          className="underline-offset-4 hover:underline"
        >
          Solicitar novo link
        </Link>
      </p>
    </form>
  );
}
