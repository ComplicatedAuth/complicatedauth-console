import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { serverProjects, serverSession } from "@/lib/server-api";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await serverSession();
  if (!session) redirect("/login");
  if (session.authentication_assurance !== "strong") {
    redirect("/setup-security");
  }
  const projects = await serverProjects();
  return (
    <AppShell session={session} projects={projects}>
      {children}
    </AppShell>
  );
}
