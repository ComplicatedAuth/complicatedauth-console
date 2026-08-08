import { cookies } from "next/headers";
import type { Project, Session } from "./api";

async function serverGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const response = await fetch(
    `${process.env.INTERNAL_API_URL ?? "http://localhost:8080"}${path}`,
    {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!response?.ok) return null;
  return response.json() as Promise<T>;
}

export async function serverSession(): Promise<Session | null> {
  return serverGet<Session>("/v1/console/auth/session");
}

export async function serverProjects(): Promise<Project[]> {
  return (
    (await serverGet<{ items: Project[] }>("/v1/projects?limit=100"))?.items ??
    []
  );
}
