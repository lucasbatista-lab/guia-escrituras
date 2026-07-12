"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        setMessage(
          "Supabase não configurado. Quando conectado, enviaremos o link de recuperação.",
        );
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${origin}/auth/callback?next=/entrar` },
      );

      if (resetError) {
        setError("Não foi possível enviar o e-mail. Tente novamente.");
        return;
      }

      setMessage("Se o e-mail existir, enviamos um link de recuperação.");
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-ink-soft" role="status">
          {message}
        </p>
      )}
      <Button type="submit" className="w-full bg-ink hover:bg-ink/90" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        <Link href="/entrar" className="underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
