import { ProjectConsole } from "@/components/project-console";
import { notFound, redirect } from "next/navigation";

const sections = ["overview", "settings", "api-keys", "users", "activity"];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectUid: string; section?: string[] }>;
}) {
  const value = await params;
  const path = value.section ?? [];
  if (path.length > 1) notFound();
  if (path[0] === "origins")
    redirect(`/app/projects/${value.projectUid}/settings#origins`);
  const section = path[0] ?? "overview";
  if (!sections.includes(section)) notFound();
  return <ProjectConsole projectUid={value.projectUid} section={section} />;
}
