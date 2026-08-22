"use client";

import {
  CheckCircleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Heading, Mono, Text } from "@/components/ui/typography";
import {
  ApiError,
  api,
  message,
  type OAuthAuthorizationRequest,
} from "@/lib/api";

const storageKey = "complicatedauth.oauth.authorization_request";
export default function OAuthAuthorizePage() {
  const [requestToken, setRequestToken] = useState(""),
    [request, setRequest] = useState<OAuthAuthorizationRequest | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<"approve" | "deny" | "">("");
  const decisionKey = useRef("");

  const load = useCallback(async () => {
    const fragmentToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("request");
    const token = fragmentToken ?? sessionStorage.getItem(storageKey) ?? "";
    if (!token) {
      setError("This authorization request is missing or has expired.");
      return;
    }
    sessionStorage.setItem(storageKey, token);
    history.replaceState(null, "", "/oauth/authorize");
    setRequestToken(token);
    try {
      const value = await api<OAuthAuthorizationRequest>(
        "/v1/oauth/authorization-requests/inspect",
        { method: "POST", body: JSON.stringify({ request_token: token }) },
      );
      setRequest(value);
      setError("");
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        caught.status === 401 &&
        caught.code === "unauthenticated"
      ) {
        window.location.replace(
          `/login?return_to=${encodeURIComponent("/oauth/authorize")}`,
        );
        return;
      }
      setError(message(caught));
    }
  }, []);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function decide(decision: "approve" | "deny") {
    if (!requestToken) return;
    setBusy(decision);
    setError("");
    if (!decisionKey.current) decisionKey.current = crypto.randomUUID();
    try {
      const result = await api<{ redirect_to: string }>(
        "/v1/oauth/authorization-requests/decision",
        {
          method: "POST",
          headers: { "Idempotency-Key": decisionKey.current },
          body: JSON.stringify({ request_token: requestToken, decision }),
        },
      );
      sessionStorage.removeItem(storageKey);
      window.location.assign(result.redirect_to);
    } catch (caught) {
      setError(message(caught));
      setBusy("");
    }
  }

  return (
    <AuthLayout>
      <BrandLogo className="mb-8 text-[#0e1129] dark:text-white lg:hidden" />
      <div className="mb-6 grid size-11 place-items-center rounded-xl bg-[#fdecea] text-[#d93d2c] dark:bg-[#3b171a] dark:text-[#ff8879]">
        <IdentificationIcon className="size-6" />
      </div>
      <p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase dark:text-[#ff8879]">
        OAuth authorization
      </p>
      <Heading>
        {request ? `Connect to ${request.application_name}?` : "Review access"}
      </Heading>
      <Text className="mt-2 text-base/7">
        {request?.resource_server_name
          ? `${request.application_name} is requesting delegated access to ${request.resource_server_name}.`
          : "ComplicatedAuth will share only the identity claims listed below."}{" "}
        This approval can be revoked later from My account.
      </Text>
      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}
      {!request && !error && (
        <div className="mt-8 h-56 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
      )}
      {request && (
        <>
          <div className="mt-7 rounded-xl bg-white p-5 ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="font-semibold">{request.application_name}</p>
                <Mono className="mt-1 block truncate text-xs text-zinc-500">
                  {request.client_id}
                </Mono>
                <Text className="mt-2">
                  Returns to <strong>{new URL(request.redirect_uri).host}</strong>
                </Text>
                {request.resource_server_identifier && (
                  <Text className="mt-1">
                    Access token audience <strong>{request.resource_server_identifier}</strong>
                  </Text>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {request.scope_details.map((scope) => (
              <div
                key={scope.name}
                className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10"
              >
                <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">{scope.display_name}</p>
                  <Mono className="mt-0.5 block text-xs text-zinc-500">{scope.name}</Mono>
                  <Text className="mt-1">{scope.description}</Text>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Button
              outline
              disabled={!!busy}
              onClick={() => void decide("deny")}
            >
              {busy === "deny" ? "Denying…" : "Deny"}
            </Button>
            <Button
              color="coral"
              disabled={!!busy}
              onClick={() => void decide("approve")}
            >
              {busy === "approve" ? "Approving…" : "Approve access"}
            </Button>
          </div>
          <Text className="mt-4 text-center text-xs">
            Request expires {new Date(request.expires_at).toLocaleString()}.
          </Text>
        </>
      )}
    </AuthLayout>
  );
}
