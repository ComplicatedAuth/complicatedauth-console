import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SecuritySetup } from "@/components/security-setup";
import { serverSession } from "@/lib/server-api";

export const metadata: Metadata = { title: "Set up account security" };
export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/app/projects";
}

export default async function SetupSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const params = await searchParams;
  const session = await serverSession();
  if (!session) {
    redirect(
      `/login?return_to=${encodeURIComponent(`/setup-security?return_to=${encodeURIComponent(safeReturnTo(params.return_to))}`)}`,
    );
  }
  if (session.authentication_assurance === "strong") {
    redirect(safeReturnTo(params.return_to));
  }
  return <SecuritySetup />;
}
