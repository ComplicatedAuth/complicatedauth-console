"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Field, Input, Label } from "@/components/ui/field";
import { Heading, Text } from "@/components/ui/typography";
import { api, message } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/v1/console/password-reset-requests", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      setSent(true);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  return <AuthLayout><form onSubmit={submit} className="grid gap-5"><BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" /><div><p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase">Account recovery</p><Heading>Reset your password</Heading><Text className="mt-2 text-base/7">Enter your Tenant Member email. If it belongs to an active account, we’ll send a one-time link.</Text></div>{error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200"><ErrorMessage>{error}</ErrorMessage></div>}{sent ? <div className="rounded-lg bg-emerald-50 px-4 py-4 text-sm text-emerald-900 ring-1 ring-emerald-200">Check your email. The reset link expires in 30 minutes.</div> : <><Field><Label>Email address</Label><Input name="email" type="email" autoComplete="email" required /></Field><Button type="submit" color="coral" disabled={busy} className="w-full">{busy ? "Requesting…" : "Send reset link"}</Button></>}<Text className="text-center"><Link className="font-semibold text-[#c93324] hover:underline dark:text-[#ff8879]" href="/login">Back to sign in</Link></Text></form></AuthLayout>;
}
