import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAuthUserContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isActiveSubscription } from "@/lib/billing";
import { getStripeClient } from "@/lib/stripe/client";
import { assertStripeConfigured } from "@/lib/stripe/config";

export default async function AssinaturaSucessoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    redirect("/entrar?next=/assinatura/sucesso");
  }

  const params = await searchParams;
  const sessionIdRaw = params.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

  let status: "processing" | "active" | "sync_error" | "forbidden" =
    "processing";

  if (sessionId) {
    try {
      assertStripeConfigured();
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const sessionUserId = session.metadata?.user_id;

      if (sessionUserId && sessionUserId !== auth.userId) {
        status = "forbidden";
      } else if (
        sessionUserId === auth.userId &&
        (session.payment_status === "paid" || session.status === "complete")
      ) {
        const admin = createAdminClient();
        const { data: sub } = await admin
          .from("subscriptions")
          .select("status")
          .eq("user_id", auth.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && isActiveSubscription(sub.status)) {
          status = "active";
        } else {
          status = "processing";
        }
      } else if (!sessionUserId) {
        // Query string alone is never enough; wait for webhook/DB.
        status = "processing";
      } else {
        status = "processing";
      }
    } catch {
      status = "sync_error";
    }
  }

  const copy = {
    processing: {
      title: "Pagamento em processamento",
      body: "Recebemos sua solicitação. A assinatura só libera acesso quando o pagamento for confirmado no sistema — a URL de retorno sozinha não ativa o plano.",
    },
    active: {
      title: "Assinatura ativa",
      body: "Sua assinatura está ativa no sistema. Você já pode usar o Amém Chat conforme seu plano.",
    },
    sync_error: {
      title: "Estamos sincronizando",
      body: "Ainda estamos confirmando a assinatura. Atualize esta página em alguns instantes ou consulte sua conta.",
    },
    forbidden: {
      title: "Sessão inválida",
      body: "Esta confirmação de pagamento não pertence à conta conectada.",
    },
  }[status];

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-3xl text-ink">{copy.title}</h1>
      <p className="mt-3 text-sm text-ink-soft">{copy.body}</p>
      <div className="mt-8 flex flex-col gap-3">
        {status !== "forbidden" ? (
          <Button asChild className="bg-ink hover:bg-ink/90">
            <Link
              href={
                status === "active" ? "/personalizar" : "/assinatura/sucesso"
              }
            >
              {status === "active"
                ? "Personalizar minha experiência"
                : "Aguardar confirmação"}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/conta">Ver minha conta</Link>
        </Button>
      </div>
    </main>
  );
}
