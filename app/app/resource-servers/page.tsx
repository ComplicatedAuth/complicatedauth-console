"use client";

import { PlusIcon, ServerStackIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mono, Text } from "@/components/ui/typography";
import {
  api,
  message,
  type ResourceServer,
  type Session,
} from "@/lib/api";

type ResourceServerPage = {
  items: ResourceServer[];
  next_cursor?: string | null;
};

export default function ResourceServersPage() {
  const router = useRouter();
  const [servers, setServers] = useState<ResourceServer[] | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [current, page] = await Promise.all([
        api<Session>("/v1/console/auth/session"),
        api<ResourceServerPage>("/v1/resource-servers?limit=100"),
      ]);
      setSession(current);
      setServers(page.items);
      setError("");
    } catch (caught) {
      setError(message(caught));
    }
  }, []);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const canManage =
    !!session && ["owner", "admin", "developer"].includes(session.member.role);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const server = await api<ResourceServer>("/v1/resource-servers", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          name: form.get("name"),
          identifier: form.get("identifier"),
        }),
      });
      setOpen(false);
      router.push(`/app/resource-servers/${server.uid}`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Workspace / Authorization"
        title="Resource servers"
        description="Register exact API audiences and their delegated capability vocabulary. Audience identifiers and scope names are protocol contracts, so they are immutable and never reused."
        actions={
          canManage ? (
            <Button color="coral" onClick={() => setOpen(true)}>
              <PlusIcon /> Register resource server
            </Button>
          ) : undefined
        }
      />
      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <Panel
        className="mt-8"
        title="API audiences"
        description="One OAuth access token is bound to at most one exact audience."
      >
        {servers === null ? (
          <div className="h-64 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : servers.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <ServerStackIcon className="mx-auto size-9 text-zinc-400" />
              <p className="mt-3 font-medium">No Resource Servers yet</p>
              <Text className="mt-1">Register an API before defining delegated scopes.</Text>
            </div>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Resource server</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Policy version</TableHeader>
                <TableHeader><span className="sr-only">Open</span></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.uid}>
                  <TableCell>
                    <div className="font-medium">{server.name}</div>
                    <Mono className="mt-1 text-xs text-zinc-500">{server.identifier}</Mono>
                  </TableCell>
                  <TableCell><StatusBadge value={server.status} /></TableCell>
                  <TableCell><Mono>scope-v1:{server.policy_version}</Mono></TableCell>
                  <TableCell className="text-right">
                    <Button outline href={`/app/resource-servers/${server.uid}`}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={create}>
          <DialogTitle>Register Resource Server</DialogTitle>
          <DialogDescription>
            Use the stable public identifier your API will require in the token audience.
          </DialogDescription>
          <DialogBody className="grid gap-5">
            <Field>
              <Label>Name</Label>
              <Input name="name" required maxLength={120} />
            </Field>
            <Field>
              <Label>Exact audience identifier</Label>
              <Input name="identifier" type="url" required placeholder="https://api.example.com" />
              <Text>HTTPS is required outside localhost development. Query and fragment are not allowed.</Text>
            </Field>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" color="coral" disabled={busy}>
              {busy ? "Registering…" : "Register resource server"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
