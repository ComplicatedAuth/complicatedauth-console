"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Field, Input, Label } from "@/components/ui/field";
import { Heading, Text } from "@/components/ui/typography";
import { api, message } from "@/lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [complete, setComplete] = useState(false);
  useEffect(() => {
    // Fragment tokens stay in the browser and are submitted only in the JSON body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.password_confirmation) { setError("Passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      await api("/v1/console/password-resets", { method: "POST", body: JSON.stringify({ token, password: values.password }) });
      window.history.replaceState(null, "", window.location.pathname);
      setComplete(true);
    } catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }
  return <AuthLayout><form onSubmit={submit} className="grid gap-5"><BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" /><div><p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase">Account recovery</p><Heading>Choose a new password</Heading><Text className="mt-2 text-base/7">Using this proof revokes every existing management session and outstanding OAuth token.</Text></div>{error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200"><ErrorMessage>{error}</ErrorMessage></div>}{complete ? <><div className="rounded-lg bg-emerald-50 px-4 py-4 text-sm text-emerald-900 ring-1 ring-emerald-200">Your password was reset and existing sessions were revoked.</div><Button href="/login" color="coral" className="w-full">Sign in</Button></> : <>{!token && <Field><Label>Reset token</Label><Input value={token} onChange={(event) => setToken(event.target.value)} required /></Field>}<Field><Label>New password</Label><Input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></Field><Field><Label>Confirm new password</Label><Input name="password_confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></Field><Button type="submit" color="coral" disabled={busy || !token} className="w-full">{busy ? "Resetting…" : "Reset password"}</Button><Text className="text-center"><Link className="font-semibold text-[#c93324] hover:underline dark:text-[#ff8879]" href="/forgot-password">Request another link</Link></Text></>}</form></AuthLayout>;
}
