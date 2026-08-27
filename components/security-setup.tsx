"use client";

import { ShieldCheckIcon } from "@heroicons/react/20/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "./auth-layout";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { ErrorMessage } from "./ui/field";
import { Heading, Text } from "./ui/typography";
import { message } from "@/lib/api";
import { enrollTenantMemberCredential } from "@/lib/console-webauthn";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enroll() {
    setBusy(true);
    setError("");
    try {
      await enrollTenantMemberCredential();
      router.replace(safeReturnTo(searchParams.get("return_to")));
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setBusy(false);
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
        <Button
          color="coral"
          disabled={busy}
          onClick={() => void enroll()}
          className="w-full"
        >
          <ShieldCheckIcon />
          {busy ? "Creating passkey…" : "Create passkey"}
        </Button>
        <Text className="text-center">
          The authenticator name and icon are detected automatically after
          registration.
        </Text>
      </div>
    </AuthLayout>
  );
}
