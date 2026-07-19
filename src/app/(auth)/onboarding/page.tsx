import { redirect } from "next/navigation";
import { authPrivateMetadata } from "@/lib/seo/auth-metadata";

export const metadata = authPrivateMetadata("Onboarding");

export default function OnboardingPage() {
  redirect("/personalizar");
}
