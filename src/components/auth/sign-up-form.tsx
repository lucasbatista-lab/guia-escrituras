"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/utils";

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.push("/onboarding");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (signUpError) {
        setError("Não foi possível criar a conta. Tente outro e-mail.");
        return;
      }

      setMessage(
        "Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada.",
      );
      router.push("/onboarding");
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
          Modo fundação: sem Supabase, o cadastro segue para o onboarding em
          demonstração.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {loading ? "Criando…" : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
