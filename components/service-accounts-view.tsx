"use client";

import {
  FingerPrintIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { FormEvent, useState } from "react";
import {
  api,
  message,
  type ServiceAccount,
  type ServiceCredential,
  type ServiceCredentialSecret,
} from "@/lib/api";
import {
  EnvironmentBadge,
  PageHeading,
  Panel,
  StatusBadge,
} from "./console-ui";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Field, Input, Label, Select, Textarea } from "./ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Mono, Text } from "./ui/typography";

const scopes = [
  {
    value: "project_users.read",
    label: "Read Project Users",
    description: "List and inspect Project-scoped application identities.",
  },
  {
    value: "project_users.write",
    label: "Manage Project Users",
    description: "Provision users, change identity state, passwords, and passkeys.",
  },
  {
    value: "authentication.perform",
    label: "Run authentication",
    description: "Execute login and FIDO or biometric enrollment ceremonies.",
  },
  {
    value: "sessions.manage",
    label: "Manage sessions",
    description: "Introspect and revoke Project User sessions.",
  },
  {
    value: "support_cases.read",
    label: "Read Support Cases",
    description: "Inspect Project Support Cases, public messages, events, and attachments.",
  },
  {
    value: "support_cases.write",
    label: "Manage Support Cases",
    description: "Create cases and add public messages or attachments for this Project.",
  },
  {
    value: "external_credentials.manage",
    label: "Issue external credentials",
    description: "Allow a trusted external platform to issue subject-bound child keys. Child keys never inherit this scope.",
  },
] as const;

export function ServiceAccountsView({
  projectUid,
  accounts,
  credentials,
  onSecret,
  onDone,
  onError,
}: {
  projectUid: string;
  accounts: ServiceAccount[];
  credentials: Record<string, ServiceCredential[]>;
  onSecret: (secret: ServiceCredentialSecret) => void;
  onDone: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceAccount | null>(null);
  const [issuing, setIssuing] = useState<ServiceAccount | null>(null);
  const [deleting, setDeleting] = useState<ServiceAccount | null>(null);
  const [revoking, setRevoking] = useState<{
    account: ServiceAccount;
    credential: ServiceCredential;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true);
    try {
      await api(`/v1/projects/${projectUid}/service-accounts`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          name: data.get("name"),
          description: data.get("description"),
          scopes: data.getAll("scopes"),
        }),
      });
      form.reset();
      await onDone("Service account created");
    } catch (caught) {
      onError(message(caught));
    } finally {
      setCreating(false);
    }
  }

  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api(
        `/v1/projects/${projectUid}/service-accounts/${editing.uid}`,
        {
          method: "PATCH",
          headers: { "If-Match": `"${editing.version}"` },
          body: JSON.stringify({
            name: data.get("name"),
            description: data.get("description"),
            status: data.get("status"),
            scopes: data.getAll("scopes"),
          }),
        },
      );
      setEditing(null);
      await onDone("Service account updated");
    } catch (caught) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function issueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issuing) return;
    const data = new FormData(event.currentTarget);
    const expiry = String(data.get("expires_at") ?? "");
    setBusy(true);
    try {
      const secret = await api<ServiceCredentialSecret>(
        `/v1/projects/${projectUid}/service-accounts/${issuing.uid}/credentials`,
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            name: data.get("name"),
            ...(expiry ? { expires_at: new Date(expiry).toISOString() } : {}),
          }),
        },
      );
      setIssuing(null);
      await onDone("Service credential issued");
      onSecret(secret);
    } catch (caught) {
      onError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(
        `/v1/projects/${projectUid}/service-accounts/${deleting.uid}`,
        {
          method: "DELETE",
          headers: { "If-Match": `"${deleting.version}"` },
        },
      );
      setDeleting(null);
      await onDone("Service account deleted");
    } catch (caught) {
      onError(message(caught));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  async function revokeCredential() {
    if (!revoking) return;
    setBusy(true);
    try {
      await api(
        `/v1/projects/${projectUid}/service-accounts/${revoking.account.uid}/credentials/${revoking.credential.uid}`,
        { method: "DELETE" },
      );
      setRevoking(null);
      await onDone("Service credential revoked");
    } catch (caught) {
      onError(message(caught));
      setRevoking(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Service accounts"
        title="Server-to-server access"
        description="Model each backend workload once, grant only the capabilities it needs, and rotate expiring credential versions with a safe overlap window."
      />
      <Panel
        className="mt-7"
        title="Create service account"
        description="A service account is the stable workload identity. It does not contain a secret."
      >
        <form onSubmit={createAccount} className="grid gap-5 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label>Workload name</Label>
              <Input name="name" required maxLength={100} placeholder="Production BFF" />
            </Field>
            <Field>
              <Label>Description</Label>
              <Input name="description" maxLength={500} placeholder="Customer login backend" />
            </Field>
          </div>
          <ScopeFields defaultScopes={scopes.filter((scope) => scope.value !== "external_credentials.manage").map((scope) => scope.value)} />
          <div className="flex justify-end">
            <Button type="submit" color="coral" disabled={creating}>
              <PlusIcon />
              {creating ? "Creating…" : "Create service account"}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mt-5 grid gap-5">
        {accounts.map((account) => {
          const versions = credentials[account.uid] ?? [];
          const activeVersions = versions.filter(
            (credential) => credential.kind === "standard" && credential.status === "active",
          ).length;
          return (
            <Panel
              key={account.uid}
              title={account.name}
              description={account.description || "No description"}
              action={
                <div className="flex items-center gap-1">
                  <Button plain onClick={() => setEditing(account)}>
                    <PencilSquareIcon /> Edit
                  </Button>
                  <Button
                    color="coral"
                    disabled={account.status !== "active" || activeVersions >= 2}
                    onClick={() => setIssuing(account)}
                  >
                    <KeyIcon /> Issue credential
                  </Button>
                  <Button plain aria-label={`Delete ${account.name}`} onClick={() => setDeleting(account)}>
                    <TrashIcon className="text-red-500" />
                  </Button>
                </div>
              }
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
                <StatusBadge value={account.status} />
                <EnvironmentBadge value={account.environment} />
                <Mono>ETag &quot;{account.version}&quot;</Mono>
                {account.scopes.map((scope) => (
                  <Badge key={scope} color="blue">{scope}</Badge>
                ))}
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Credential version</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Expires</TableHeader>
                    <TableHeader>Last used</TableHeader>
                    <TableHeader><span className="sr-only">Actions</span></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((credential) => (
                    <TableRow key={credential.uid}>
                      <TableCell>
                        <div className="font-medium">{credential.name}</div>
                        {credential.kind === "external_platform" && <Badge color="violet">External platform</Badge>}
                        <Mono className="mt-1 block text-zinc-500">{credential.prefix}••••</Mono>
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <FingerPrintIcon className="size-3.5" />
                          <Mono>{credential.fingerprint}</Mono>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={credential.status} />
                        {credential.revocation_reason && (
                          <Text className="mt-1">{credential.revocation_reason}</Text>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(credential.expires_at)}</TableCell>
                      <TableCell>{credential.last_used_at ? formatDate(credential.last_used_at) : "Never"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          plain
                          disabled={credential.status !== "active"}
                          onClick={() => setRevoking({ account, credential })}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {versions.length === 0 && (
                <Text className="p-6 text-center">No credential versions yet.</Text>
              )}
              <div className="border-t border-zinc-950/10 bg-zinc-50 px-5 py-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/[0.025] dark:text-zinc-400">
                Rotation: issue a replacement, deploy it, verify its <strong>Last used</strong> value, then revoke the old version. {activeVersions}/2 active slots used.
              </div>
            </Panel>
          );
        })}
        {accounts.length === 0 && (
          <Panel>
            <Text className="p-10 text-center">No service accounts yet.</Text>
          </Panel>
        )}
      </div>

      <Dialog open={editing !== null} onClose={() => setEditing(null)}>
        <form key={editing?.uid} onSubmit={updateAccount}>
          <DialogTitle>Edit service account</DialogTitle>
          <DialogDescription>
            Scope changes apply to every credential on its next request. Disabling permanently revokes all active credentials.
          </DialogDescription>
          <DialogBody className="grid gap-5">
            <Field><Label>Name</Label><Input name="name" required defaultValue={editing?.name} /></Field>
            <Field><Label>Description</Label><Textarea name="description" defaultValue={editing?.description} /></Field>
            <Field>
              <Label>Status</Label>
              <Select name="status" defaultValue={editing?.status}>
                <option value="active">Active</option>
                <option value="disabled">Disabled — revoke credentials</option>
              </Select>
            </Field>
            <ScopeFields defaultScopes={editing?.scopes ?? []} />
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" color="coral" disabled={busy}>Save changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={issuing !== null} onClose={() => setIssuing(null)} size="md">
        <form key={issuing?.uid} onSubmit={issueCredential}>
          <DialogTitle>Issue service credential</DialogTitle>
          <DialogDescription>
            The secret is shown once. Omit expiry to use the 90-day default; the maximum is 365 days.
          </DialogDescription>
          <DialogBody className="grid gap-5">
            <Field><Label>Deployment label</Label><Input name="name" required placeholder="August 2026 deploy" /></Field>
            <Field><Label>Explicit expiry (optional)</Label><Input name="expires_at" type="datetime-local" /></Field>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setIssuing(null)}>Cancel</Button>
            <Button type="submit" color="coral" disabled={busy}>Issue credential</Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "service account"}?`}
        description="This tombstones the workload identity and permanently revokes every active credential version."
        confirmLabel="Delete service account"
        onClose={() => setDeleting(null)}
        onConfirm={() => void deleteAccount()}
      />
      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke ${revoking?.credential.name ?? "credential"}?`}
        description="This credential version will stop working immediately. Other active versions remain valid."
        confirmLabel="Revoke credential"
        onClose={() => setRevoking(null)}
        onConfirm={() => void revokeCredential()}
      />
    </div>
  );
}

function ScopeFields({ defaultScopes }: { defaultScopes: readonly string[] }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-zinc-950 dark:text-white">Effective scopes</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {scopes.map((scope) => (
          <label key={scope.value} className="flex gap-3 rounded-lg border border-zinc-950/10 p-3 dark:border-white/10">
            <input
              type="checkbox"
              name="scopes"
              value={scope.value}
              defaultChecked={defaultScopes.includes(scope.value)}
              className="mt-1 size-4 border-zinc-400 bg-white text-zinc-950 accent-[#ef4835] dark:border-zinc-500 dark:bg-zinc-950 dark:text-white"
            />
            <span>
              <span className="block text-sm font-medium">{scope.label}</span>
              <span className="mt-0.5 block text-xs/5 text-zinc-500 dark:text-zinc-400">{scope.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
