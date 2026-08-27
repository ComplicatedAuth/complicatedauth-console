"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import {
  api,
  type Session,
  type TenantMemberLoginAttempt,
  type TenantMemberLoginProgress,
  type TenantMemberWebAuthnCeremony,
  type TenantMemberWebAuthnCredential,
} from "./api";

export type WebAuthnMode = "passkey" | "security_key";

function requireWebAuthn() {
  if (!browserSupportsWebAuthn()) {
    throw new Error(
      "This browser does not support passkeys or security keys. Use a current browser with WebAuthn enabled.",
    );
  }
}

function loginHeaders(secret: string) {
  return { "X-ComplicatedAuth-Login-Secret": secret };
}

async function createCredential(ceremony: TenantMemberWebAuthnCeremony) {
  requireWebAuthn();
  return startRegistration({
    optionsJSON:
      ceremony.public_key as unknown as PublicKeyCredentialCreationOptionsJSON,
  });
}

async function getCredential(ceremony: TenantMemberWebAuthnCeremony) {
  requireWebAuthn();
  return startAuthentication({
    optionsJSON:
      ceremony.public_key as unknown as PublicKeyCredentialRequestOptionsJSON,
  });
}

export async function completeTenantMemberLogin({
  email,
  password,
  mode,
}: {
  email: string;
  password: string;
  mode: WebAuthnMode;
}): Promise<Session> {
  const attempt = await api<TenantMemberLoginAttempt>(
    "/v1/console/login-attempts",
    { method: "POST", body: JSON.stringify({ email }) },
  );
  const attemptPath = `/v1/console/login-attempts/${encodeURIComponent(attempt.uid)}`;
  const headers = loginHeaders(attempt.client_secret);
  const progress = await api<TenantMemberLoginProgress>(
    `${attemptPath}/password-verifications`,
    { method: "POST", headers, body: JSON.stringify({ password }) },
  );

  if (progress.credential_setup_required) {
    if (mode !== "passkey") {
      throw new Error(
        "No legacy security key is enrolled. Continue with passkey to complete setup.",
      );
    }
    const ceremony = await api<TenantMemberWebAuthnCeremony>(
      `${attemptPath}/webauthn-registration-ceremonies`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: "passkey" }),
      },
    );
    const credential = await createCredential(ceremony);
    return api<Session>(`${attemptPath}/webauthn-registration-verifications`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "passkey",
        ceremony_uid: ceremony.uid,
        credential,
      }),
    });
  }

  const ceremony = await api<TenantMemberWebAuthnCeremony>(
    `${attemptPath}/webauthn-authentication-ceremonies`,
    { method: "POST", headers, body: JSON.stringify({ mode }) },
  );
  const credential = await getCredential(ceremony);
  return api<Session>(`${attemptPath}/webauthn-authentication-verifications`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode, ceremony_uid: ceremony.uid, credential }),
  });
}

export async function enrollTenantMemberCredential(): Promise<TenantMemberWebAuthnCredential> {
  const ceremony = await api<TenantMemberWebAuthnCeremony>(
    "/v1/console/webauthn-registration-ceremonies",
    { method: "POST", body: JSON.stringify({ mode: "passkey" }) },
  );
  const credential = await createCredential(ceremony);
  return api<TenantMemberWebAuthnCredential>(
    "/v1/console/webauthn-registration-verifications",
    {
      method: "POST",
      body: JSON.stringify({
        mode: "passkey",
        ceremony_uid: ceremony.uid,
        credential,
      }),
    },
  );
}

// These exported aliases make the protocol boundary explicit without leaking the
// browser library's types into API-facing components.
export type BrowserRegistrationCredential = RegistrationResponseJSON;
export type BrowserAuthenticationCredential = AuthenticationResponseJSON;
