"use client";

import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
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
  type ResourceServerScope,
  type Session,
} from "@/lib/api";

type ScopeList = { items: ResourceServerScope[] };

export default function ResourceServerPage() {
  const params = useParams<{ resourceServerUid: string }>();
  const router = useRouter();
  const resourceServerUID = params.resourceServerUid;
  const [server, setServer] = useState<ResourceServer | null>(null),
    [scopes, setScopes] = useState<ResourceServerScope[]>([]),
    [session, setSession] = useState<Session | null>(null),
    [scopeOpen, setScopeOpen] = useState(false),
    [scopeToDelete, setScopeToDelete] = useState<ResourceServerScope | null>(null),
    [deleteOpen, setDeleteOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const [current, loaded, scopeList] = await Promise.all([
        api<Session>("/v1/console/auth/session"),
        api<ResourceServer>(`/v1/resource-servers/${resourceServerUID}`),
        api<ScopeList>(`/v1/resource-servers/${resourceServerUID}/scopes`),
      ]);
      setSession(current);
      setServer(loaded);
      setScopes(scopeList.items);
      setError("");
    } catch (caught) {
      setError(message(caught));
    }
  }, [resourceServerUID]);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const canManage =
    !!session && ["owner", "admin", "developer"].includes(session.member.role);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!server) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const updated = await api<ResourceServer>(
        `/v1/resource-servers/${resourceServerUID}`,
        {
          method: "PATCH",
          headers: { "If-Match": `"${server.version}"` },
          body: JSON.stringify({
            name: form.get("name"),
            status: form.get("status"),
          }),
        },
      );
      setServer(updated);
      setNotice("Resource Server updated.");
    } catch (caught) {
      setError(message(caught));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api<ResourceServerScope>(
        `/v1/resource-servers/${resourceServerUID}/scopes`,
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            name: form.get("name"),
            display_name: form.get("display_name"),
            description: form.get("description"),
          }),
        },
      );
      setScopeOpen(false);
      setNotice("Delegated scope created.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function setScopeStatus(scope: ResourceServerScope) {
    setBusy(true);
    setError("");
    try {
      await api(
        `/v1/resource-servers/${resourceServerUID}/scopes/${scope.uid}`,
        {
          method: "PATCH",
          headers: { "If-Match": `"${scope.version}"` },
          body: JSON.stringify({
            status: scope.status === "active" ? "disabled" : "active",
          }),
        },
      );
      await load();
    } catch (caught) {
      setError(message(caught));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteScope() {
    if (!scopeToDelete) return;
    setBusy(true);
    try {
      await api(
        `/v1/resource-servers/${resourceServerUID}/scopes/${scopeToDelete.uid}`,
        {
          method: "DELETE",
          headers: { "If-Match": `"${scopeToDelete.version}"` },
        },
      );
      setScopeToDelete(null);
      await load();
    } catch (caught) {
      setError(message(caught));
      setScopeToDelete(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteServer() {
    if (!server) return;
    setBusy(true);
    try {
      await api(`/v1/resource-servers/${resourceServerUID}`, {
        method: "DELETE",
        headers: { "If-Match": `"${server.version}"` },
      });
      router.push("/app/resource-servers");
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setDeleteOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!server) {
    return (
      <div className="mx-auto max-w-6xl">
        {error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div> : <div className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Button plain href="/app/resource-servers" className="mb-5 -ml-3">
        <ArrowLeftIcon /> Resource servers
      </Button>
      <PageHeading
        eyebrow="Authorization / Audience"
        title={server.name}
        description="The audience identifier and scope tokens are immutable protocol names. Human labels and active status may evolve through versioned resources."
        actions={<StatusBadge value={server.status} />}
      />
      {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Audience registration">
          <form onSubmit={update} className="grid gap-5 p-5">
            <Field>
              <Label>Exact audience identifier</Label>
              <Input value={server.identifier} readOnly />
            </Field>
            <Field>
              <Label>Name</Label>
              <Input name="name" defaultValue={server.name} required disabled={!canManage} />
            </Field>
            <Field>
              <Label>Status</Label>
              <Select name="status" defaultValue={server.status} disabled={!canManage}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </Field>
            {canManage && <div className="flex justify-end"><Button type="submit" color="coral" disabled={busy}>Save changes</Button></div>}
          </form>
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Policy contract">
            <div className="p-5">
              <Mono>scope-v1:{server.policy_version}</Mono>
              <Text className="mt-2">Resource ETag &quot;{server.version}&quot;</Text>
            </div>
          </Panel>
          {canManage && (
            <Panel title="Delete Resource Server" description="The audience identifier remains reserved.">
              <div className="p-5"><Button outline onClick={() => setDeleteOpen(true)}><TrashIcon /> Delete resource server</Button></div>
            </Panel>
          )}
        </div>
      </div>
      <Panel
        className="mt-6"
        title="Delegated scopes"
        description="Scopes are capabilities requested by OAuth clients and shown during explicit consent."
        action={canManage ? <Button color="coral" onClick={() => setScopeOpen(true)}><PlusIcon /> Create scope</Button> : undefined}
      >
        {scopes.length === 0 ? (
          <div className="grid min-h-44 place-items-center px-6 text-center"><Text>No delegated scopes defined.</Text></div>
        ) : (
          <Table>
            <TableHead><TableRow><TableHeader>Scope</TableHeader><TableHeader>Status</TableHeader><TableHeader>Version</TableHeader>{canManage && <TableHeader><span className="sr-only">Actions</span></TableHeader>}</TableRow></TableHead>
            <TableBody>
              {scopes.map((scope) => (
                <TableRow key={scope.uid}>
                  <TableCell>
                    <Mono>{scope.name}</Mono>
                    <div className="mt-1 font-medium">{scope.display_name}</div>
                    {scope.description && <Text className="mt-1">{scope.description}</Text>}
                  </TableCell>
                  <TableCell><StatusBadge value={scope.status} /></TableCell>
                  <TableCell><Mono>&quot;{scope.version}&quot;</Mono></TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button plain disabled={busy} onClick={() => void setScopeStatus(scope)}>{scope.status === "active" ? "Disable" : "Enable"}</Button>
                        <Button plain disabled={busy} onClick={() => setScopeToDelete(scope)}><TrashIcon /> Delete</Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Dialog open={scopeOpen} onClose={() => setScopeOpen(false)}>
        <form onSubmit={createScope}>
          <DialogTitle>Create delegated scope</DialogTitle>
          <DialogDescription>The protocol token cannot be renamed or reused after deletion.</DialogDescription>
          <DialogBody className="grid gap-5">
            <Field><Label>Scope token</Label><Input name="name" required pattern="[a-z][a-z0-9._:-]*" placeholder="documents.read" /><Text>Lowercase letters, digits, dots, underscores, colons, and hyphens.</Text></Field>
            <Field><Label>Consent label</Label><Input name="display_name" required maxLength={120} placeholder="Read documents" /></Field>
            <Field><Label>Description</Label><Textarea name="description" maxLength={500} /></Field>
          </DialogBody>
          <DialogActions><Button plain onClick={() => setScopeOpen(false)}>Cancel</Button><Button type="submit" color="coral" disabled={busy}>{busy ? "Creating…" : "Create scope"}</Button></DialogActions>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!scopeToDelete}
        title={`Delete ${scopeToDelete?.name ?? "scope"}?`}
        description="This tombstones the scope token and revokes every server-tracked access token carrying it. The name cannot be reused for a different meaning."
        confirmLabel="Delete scope"
        onClose={() => setScopeToDelete(null)}
        onConfirm={() => void deleteScope()}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Resource Server?"
        description="This tombstones the exact audience and revokes affected server-tracked tokens. The identifier cannot be reused."
        confirmLabel="Delete resource server"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void deleteServer()}
      />
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}
