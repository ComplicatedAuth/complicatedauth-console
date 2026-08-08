"use client";

import {
  ArrowLeftIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Panel } from "@/components/console-ui";
import { Button } from "@/components/ui/button";
import {
  Description,
  ErrorMessage,
  Field,
  Input,
  Label,
  Select,
} from "@/components/ui/field";
import { Text } from "@/components/ui/typography";
import { api, message, type Project } from "@/lib/api";

export default function NewProject() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [environment, setEnvironment] = useState("sandbox");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const project = await api<Project>("/v1/projects", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      router.push(`/app/projects/${project.uid}`);
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Projects
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="pt-1">
          <p className="mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase dark:text-[#ff8879]">
            New Project
          </p>
          <h1 className="text-3xl/9 font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white">
            Define a clean authentication boundary
          </h1>
          <Text className="mt-4 text-base/7">
            The relying-party settings established here become authoritative for
            every passkey ceremony in this Project.
          </Text>
          <div className="mt-8 grid gap-6">
            {[
              {
                icon: ShieldCheckIcon,
                title: "Hard isolation",
                text: "User and credential lookups never cross this boundary.",
              },
              {
                icon: GlobeAltIcon,
                title: "Origin validation",
                text: "Only explicitly configured Origins can complete ceremonies.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fdecea] text-[#d93d2c] dark:bg-[#3b171a] dark:text-[#ff8879]">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {item.title}
                  </h2>
                  <Text className="mt-1">{item.text}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={submit}>
          <Panel title="1 — Project identity">
            <div className="grid gap-6 p-5">
              <Field>
                <Label>Project name</Label>
                <Input name="name" required placeholder="Acme Web App" />
              </Field>
              <Field>
                <Label>Environment</Label>
                <Select
                  name="environment"
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value)}
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </Select>
                {environment === "sandbox" && (
                  <Description className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/40">
                    Sandbox Projects are for development and testing only.
                  </Description>
                )}
              </Field>
            </div>
          </Panel>
          <Panel title="2 — Relying party configuration" className="mt-4">
            <div className="grid gap-6 p-5">
              <Field>
                <Label>RP ID</Label>
                <Input
                  name="rp_id"
                  required
                  defaultValue="localhost"
                  className="font-mono"
                />
                <Description>
                  Cannot be changed after the first passkey registration.
                </Description>
              </Field>
              <Field>
                <Label>RP name</Label>
                <Input name="rp_name" required placeholder="Acme" />
              </Field>
              <Field>
                <Label>Initial Origin</Label>
                <Input
                  name="initial_origin"
                  type="url"
                  required
                  defaultValue="http://localhost:3000"
                  className="font-mono"
                />
                <Description>
                  HTTP is accepted only for localhost and loopback development.
                </Description>
              </Field>
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900/60">
                  <ErrorMessage>{error}</ErrorMessage>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-950/10 px-5 py-4 dark:border-white/10">
              <Button
                type="button"
                outline
                onClick={() => router.push("/app/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" color="coral" disabled={busy}>
                {busy ? "Creating…" : "Create Project"}
              </Button>
            </div>
          </Panel>
        </form>
      </div>
    </div>
  );
}
