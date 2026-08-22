"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Field, Input, Label } from "@/components/ui/field";
import { Heading, Text } from "@/components/ui/typography";
import { api, message } from "@/lib/api";

export default function AcceptInvitationPage() {
  const params = useParams<{ invitationUid: string }>(), router = useRouter();
  const [token, setToken] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    // The URL fragment is intentionally browser-only and never reaches an HTTP access log.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      await api(`/v1/tenant/invitations/${params.invitationUid}/accept`, { method: "POST", body: JSON.stringify({ ...values, acceptance_token: token }) });
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/setup-security?return_to=%2Fapp%2Fprojects"); router.refresh();
    } catch (caught) { setError(message(caught)); setBusy(false); }
  }
  return <AuthLayout><form onSubmit={submit} className="grid gap-5"><BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" /><div><p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase">Tenant invitation</p><Heading>Join the workspace</Heading><Text className="mt-2 text-base/7">Set the profile and password for your new Tenant membership.</Text></div>{error && <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200"><ErrorMessage>{error}</ErrorMessage></div>}<Field><Label>Display name</Label><Input name="display_name" autoComplete="name" required /></Field><Field><Label>Password</Label><Input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></Field>{!token && <Field><Label>Acceptance token</Label><Input value={token} onChange={(event) => setToken(event.target.value)} required /><Text>The invitation link normally fills this value from a browser-only URL fragment.</Text></Field>}<Button type="submit" color="coral" disabled={busy || !token} className="w-full">{busy ? "Joining…" : "Accept invitation"}</Button></form></AuthLayout>;
}
