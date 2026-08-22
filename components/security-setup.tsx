"use client";

import { KeyIcon, ShieldCheckIcon } from "@heroicons/react/20/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "./auth-layout";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { ErrorMessage, Field, Input, Label } from "./ui/field";
import { Heading, Text } from "./ui/typography";
import { message } from "@/lib/api";
import {
  defaultCredentialName,
  enrollTenantMemberCredential,
  type WebAuthnMode,
} from "@/lib/console-webauthn";

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/app/projects";
}

export function SecuritySetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("This device");
  const [busy, setBusy] = useState<WebAuthnMode | null>(null);
  const [error, setError] = useState("");

  async function enroll(mode: WebAuthnMode) {
    setBusy(mode);
    setError("");
    try {
      await enrollTenantMemberCredential({
        name: name.trim() || defaultCredentialName(mode),
        mode,
      });
      router.replace(safeReturnTo(searchParams.get("return_to")));
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setBusy(null);
    }
  }

  return (
    <AuthLayout>
      <div className="grid gap-5">
        <BrandLogo className="mb-2 text-[#0e1129] dark:text-white lg:hidden" />
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase dark:text-[#ff8879]">
            Required security setup
          </p>
          <Heading>Protect your management account</Heading>
          <Text className="mt-2 text-base/7">
            Register a user-verified authenticator before entering the console.
            Your password is never sufficient on its own.
          </Text>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900/60">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
        <Field>
          <Label>Authenticator name</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
            autoComplete="off"
          />
          <Text>Use a label you will recognize in account security.</Text>
        </Field>
        <Button
          color="coral"
          disabled={busy !== null}
          onClick={() => void enroll("passkey")}
          className="w-full"
        >
          <ShieldCheckIcon />
          {busy === "passkey" ? "Creating passkey…" : "Create passkey"}
        </Button>
        <Button
          outline
          disabled={busy !== null}
          onClick={() => void enroll("security_key")}
          className="w-full"
        >
          <KeyIcon />
          {busy === "security_key"
            ? "Waiting for security key…"
            : "Register hardware security key"}
        </Button>
        <Text className="text-center">
          Passkeys are the easiest default. Hardware keys request direct
          attestation and are useful for higher-assurance demonstrations.
        </Text>
      </div>
    </AuthLayout>
  );
}
