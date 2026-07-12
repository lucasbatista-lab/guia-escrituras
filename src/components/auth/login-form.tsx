"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasSupabaseEnv()) {
        router.push("/inicio");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Não foi possível entrar. Verifique e-mail e senha.");
        return;
      }

      router.push("/inicio");
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!hasSupabaseEnv() && (
        <p className="rounded-md bg-sand-200/70 px-3 py-2 text-xs text-ink-soft">
          Modo fundação: Supabase ainda não configurado. Entrar abre a
          plataforma em demonstração.
        </p>
      )}
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
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full bg-ink hover:bg-ink/90" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-ink underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
      <p className="text-center text-sm text-ink-soft">
        <Link
          href="/recuperar-senha"
          className="underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
