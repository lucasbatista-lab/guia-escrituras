import type { Metadata } from "next";
import { buildPublicPageMetadata, privateRobotsMetadata } from "@/lib/seo";

/** Shared helpers for auth route metadata (indexable entry vs transactional). */

export const authEntryMetadata = {
  entrar: buildPublicPageMetadata({
    title: "Entrar",
    description:
      "Acesse sua conta no Amém Chat para continuar suas reflexões e sua jornada.",
    path: "/entrar",
  }),
  cadastro: buildPublicPageMetadata({
    title: "Criar conta",
    description:
      "Crie sua conta no Amém Chat para refletir com inteligência artificial inspirada nas Escrituras.",
    path: "/cadastro",
  }),
} as const;

export const authPrivateMetadata = (
  title: string,
): Metadata => ({
  title,
  ...privateRobotsMetadata,
});
