"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Field, Input, Label } from "@/components/ui/field";
import { Heading, Text } from "@/components/ui/typography";
import { api, message } from "@/lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [complete, setComplete] = useState(false);
  useEffect(() => {
    // Fragment tokens stay out of HTTP access logs and referrer headers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  }, []);
  async function verify() {
    setBusy(true); setError("");
    try {
      await api("/v1/console/email-verifications", { method: "POST", body: JSON.stringify({ token }) });
      window.history.replaceState(null, "", window.location.pathname);
      setComplete(true); router.refresh();
    } catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }
  return <AuthLayout><div className="grid gap-5"><BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" /><div><p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase">Email ownership</p><Heading>{complete ? "Email verified" : "Verify your email"}</Heading><Text className="mt-2 text-base/7">Verification confirms email ownership. It does not create a session or replace authentication.</Text></div>{error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200"><ErrorMessage>{error}</ErrorMessage></div>}{complete ? <Button href="/app/account" color="coral" className="w-full">Continue to account</Button> : <>{!token && <Field><Label>Verification token</Label><Input value={token} onChange={(event) => setToken(event.target.value)} required /></Field>}<Button color="coral" disabled={busy || !token} onClick={() => void verify()} className="w-full">{busy ? "Verifying…" : "Verify email"}</Button></>}</div></AuthLayout>;
}
