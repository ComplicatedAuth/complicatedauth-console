"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, message } from "@/lib/api";
import {
  completeTenantMemberLogin,
  type WebAuthnMode,
} from "@/lib/console-webauthn";
import { AuthLayout } from "./auth-layout";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { ErrorMessage, Field, Input, Label } from "./ui/field";
import { Heading, Text } from "./ui/typography";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [password, setPassword] = useState(""),
    [pendingMode, setPendingMode] = useState<WebAuthnMode | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const authenticatorMode: WebAuthnMode =
      submitter?.value === "security_key" ? "security_key" : "passkey";
    setPendingMode(authenticatorMode);
    try {
      if (signup) {
        await api("/v1/console/auth/signup", {
          method: "POST",
          body: JSON.stringify(values),
        });
        router.push(
          "/setup-security?return_to=%2Fapp%2Fprojects%2Fnew",
        );
        router.refresh();
        return;
      }

      await completeTenantMemberLogin({
        email: String(values.email ?? ""),
        password: String(values.password ?? ""),
        mode: authenticatorMode,
      });
      const requestedReturn = new URLSearchParams(window.location.search).get(
        "return_to",
      );
      const returnTo =
        requestedReturn?.startsWith("/") &&
        !requestedReturn.startsWith("//") &&
        !requestedReturn.includes("\\")
          ? requestedReturn
          : null;
      router.push(returnTo ?? "/app/projects");
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setBusy(false);
      setPendingMode(null);
    }
  }
  return (
    <AuthLayout>
      <form onSubmit={submit} className="grid gap-5">
        <BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" />
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase dark:text-[#ff8879]">
            {signup ? "Create account" : "Tenant member login"}
          </p>
          <Heading>{signup ? "Start your workspace" : "Sign in"}</Heading>
          <Text className="mt-2 text-base/7">
            {signup
              ? "Your Tenant and owner account are created together. We’ll email a separate ownership-verification link."
              : "Verify your password, then use an enrolled passkey or security key. A password alone never creates a management session."}
          </Text>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900/60">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
        {signup && (
          <>
            <Field>
              <Label>Display name</Label>
              <Input
                name="display_name"
                autoComplete="name"
                required
                placeholder="Alice Chen"
              />
            </Field>
            <Field>
              <Label>Tenant name</Label>
              <Input
                name="tenant_name"
                required
                placeholder="Acme Corporation"
              />
            </Field>
          </>
        )}
        <Field>
          <Label>Email address</Label>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="alice@example.com"
          />
        </Field>
        <Field>
          <Label>Password</Label>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={signup ? "At least 12 characters" : "Your password"}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlashIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
          {signup && (
            <div className="grid grid-cols-3 gap-1.5">
              {[4, 8, 12].map((length, index) => (
                <span
                  key={length}
                  className={`h-1 rounded-full ${password.length >= length ? (index === 0 ? "bg-[#ef4835]" : index === 1 ? "bg-amber-400" : "bg-emerald-500") : "bg-zinc-200 dark:bg-zinc-800"}`}
                />
              ))}
            </div>
          )}
        </Field>
        {!signup && (
          <div className="-mt-2 text-right">
            <Link className="text-sm font-semibold text-[#c93324] hover:underline dark:text-[#ff8879]" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}
        <Button
          type="submit"
          color="coral"
          disabled={busy}
          name={signup ? undefined : "authenticator_mode"}
          value={signup ? undefined : "passkey"}
          className="mt-1 w-full"
        >
          {busy
            ? signup
              ? "Creating account…"
              : pendingMode === "security_key"
                ? "Waiting for security key…"
                : "Waiting for passkey…"
            : signup
              ? "Create account"
              : "Continue with passkey"}
        </Button>
        {!signup && (
          <Button
            type="submit"
            outline
            disabled={busy}
            name="authenticator_mode"
            value="security_key"
            className="w-full"
          >
            Use a security key
          </Button>
        )}
        <Text className="text-center">
          {signup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <Link
            className="font-semibold text-[#c93324] underline decoration-[#ef4835]/30 dark:text-[#ff8879] dark:decoration-[#ff8879]/40"
            href={signup ? "/login" : "/signup"}
          >
            {signup ? "Sign in" : "Create one"}
          </Link>
        </Text>
      </form>
    </AuthLayout>
  );
}
