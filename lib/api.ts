import type { components } from "./schema";

export type Session = components["schemas"]["ConsoleSession"];
export type Project = components["schemas"]["Project"];
export type Origin = components["schemas"]["Origin"];
export type ApiKey = components["schemas"]["ApiKey"];
export type ApiKeySecret = components["schemas"]["ApiKeySecret"];
export type ProjectUser = components["schemas"]["ProjectUser"];
export type AuditEvent = components["schemas"]["AuditEvent"];

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?: {code?: string; message?: string}} | null;
    throw new ApiError(response.status, body?.error?.code ?? "request_failed", body?.error?.message ?? "The request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong."; }
