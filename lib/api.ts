import type { components } from "./schema";

export type Session = components["schemas"]["ConsoleSession"];
export type Project = components["schemas"]["Project"];
export type Origin = components["schemas"]["Origin"];
export type ServiceAccount = components["schemas"]["ServiceAccount"];
export type ServiceCredential = components["schemas"]["ServiceCredential"];
export type ServiceCredentialSecret = components["schemas"]["ServiceCredentialSecret"];
export type ProjectUser = components["schemas"]["ProjectUser"];
export type AuditEvent = components["schemas"]["AuditEvent"];
export type TenantMember = components["schemas"]["TenantMember"];
export type TenantRole = components["schemas"]["TenantRole"];
export type TenantInvitation = components["schemas"]["TenantInvitation"];
export type TenantMemberSession = components["schemas"]["TenantMemberSession"];
export type TenantMemberLoginAttempt = components["schemas"]["TenantMemberLoginAttempt"];
export type TenantMemberLoginProgress = components["schemas"]["TenantMemberLoginProgress"];
export type TenantMemberWebAuthnCeremony = components["schemas"]["TenantMemberWebAuthnCeremony"];
export type TenantMemberWebAuthnCredential = components["schemas"]["TenantMemberWebAuthnCredential"];
export type OAuthApplication = components["schemas"]["OAuthApplication"];
export type OAuthApplicationType = components["schemas"]["OAuthApplicationType"];
export type OAuthClientSecret = components["schemas"]["OAuthClientSecret"];
export type OAuthClientSecretSecret = components["schemas"]["OAuthClientSecretSecret"];
export type OAuthAuthorizationRequest = components["schemas"]["OAuthAuthorizationRequest"];
export type OAuthConsent = components["schemas"]["OAuthConsent"];
export type OpenIdConfiguration = components["schemas"]["OpenIdConfiguration"];
export type ResourceServer = components["schemas"]["ResourceServer"];
export type ResourceServerScope = components["schemas"]["ResourceServerScope"];
export type OAuthApplicationGrant = components["schemas"]["OAuthApplicationGrant"];
export type AuthorizationDecision = components["schemas"]["AuthorizationDecision"];
export type SupportCase = components["schemas"]["SupportCase"];
export type SupportCaseMessage = components["schemas"]["SupportCaseMessage"];
export type SupportCaseAttachment = components["schemas"]["SupportCaseAttachment"];
export type SupportCaseEvent = components["schemas"]["SupportCaseEvent"];
export type SupportCaseExternalReference = components["schemas"]["SupportCaseExternalReference"];

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?: {code?: string; message?: string}} | null;
    throw new ApiError(response.status, body?.error?.code ?? "request_failed", body?.error?.message ?? "The request failed.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong."; }
