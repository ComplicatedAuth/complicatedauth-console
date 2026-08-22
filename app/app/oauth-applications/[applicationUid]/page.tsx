"use client";

import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Toast } from "@/components/toast";
import { OAuthApplicationGrants } from "@/components/oauth-application-grants";
import { Badge } from "@/components/ui/badge";
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
  type OAuthApplication,
  type OAuthClientSecret,
  type OAuthClientSecretSecret,
  type Session,
} from "@/lib/api";

type ClientSecretList = { items: OAuthClientSecret[] };

export default function OAuthApplicationPage() {
  const params = useParams<{ applicationUid: string }>();
  const router = useRouter();
  const applicationUID = params.applicationUid;
  const [application, setApplication] = useState<OAuthApplication | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [secrets, setSecrets] = useState<OAuthClientSecret[]>([]),
    [secretOpen, setSecretOpen] = useState(false),
    [createdSecret, setCreatedSecret] =
      useState<OAuthClientSecretSecret | null>(null),
    [deleteOpen, setDeleteOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const [current, loaded] = await Promise.all([
        api<Session>("/v1/console/auth/session"),
        api<OAuthApplication>(`/v1/oauth/applications/${applicationUID}`),
      ]);
      setSession(current);
      setApplication(loaded);
      if (loaded.application_type === "confidential") {
        setSecrets(
          (
            await api<ClientSecretList>(
              `/v1/oauth/applications/${applicationUID}/client-secrets`,
            )
          ).items,
        );
      } else {
        setSecrets([]);
      }
      setError("");
    } catch (caught) {
      setError(message(caught));
    }
  }, [applicationUID]);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const canManage =
    !!session && ["owner", "admin", "developer"].includes(session.member.role);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const updated = await api<OAuthApplication>(
        `/v1/oauth/applications/${applicationUID}`,
        {
          method: "PATCH",
          headers: { "If-Match": `"${application.version}"` },
          body: JSON.stringify({
            name: form.get("name"),
            status: form.get("status"),
            redirect_uris: String(form.get("redirect_uris") ?? "")
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean),
          }),
        },
      );
      setApplication(updated);
      setNotice("OAuth Application updated.");
    } catch (caught) {
      setError(message(caught));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expiresAt = String(form.get("expires_at") ?? "");
    setBusy(true);
    setError("");
    try {
      const created = await api<OAuthClientSecretSecret>(
        `/v1/oauth/applications/${applicationUID}/client-secrets`,
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            name: form.get("name"),
            ...(expiresAt
              ? { expires_at: new Date(expiresAt).toISOString() }
              : {}),
          }),
        },
      );
      setSecretOpen(false);
      setCreatedSecret(created);
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function revokeSecret(secret: OAuthClientSecret) {
    setBusy(true);
    try {
      await api(
        `/v1/oauth/applications/${applicationUID}/client-secrets/${secret.uid}`,
        { method: "DELETE" },
      );
      setNotice("Client secret revoked.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteApplication() {
    if (!application) return;
    setBusy(true);
    try {
      await api(`/v1/oauth/applications/${applicationUID}`, {
        method: "DELETE",
        headers: { "If-Match": `"${application.version}"` },
      });
      router.push("/app/oauth-applications");
      router.refresh();
    } catch (caught) {
      setError(message(caught));
      setDeleteOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function closeSecretDialog() {
    setSecretOpen(false);
    setCreatedSecret(null);
  }

  if (!application) {
    return (
      <div className="mx-auto max-w-6xl">
        {error ? (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : (
          <div className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Button plain href="/app/oauth-applications" className="mb-5 -ml-3">
        <ArrowLeftIcon /> OAuth applications
      </Button>
      <PageHeading
        eyebrow={`OAuth / ${application.application_type}`}
        title={application.name}
        description="Client type and client ID are immutable. Redirect changes use optimistic concurrency so one administrator cannot silently overwrite another."
        actions={
          <div className="flex gap-2">
            <StatusBadge value={application.status} />
            <Badge
              color={
                application.application_type === "confidential"
                  ? "violet"
                  : "blue"
              }
            >
              {application.application_type}
            </Badge>
          </div>
        }
      />
      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Registration" description="Exact redirect matching only.">
          <form onSubmit={update} className="grid gap-5 p-5">
            <Field>
              <Label>Client ID</Label>
              <Input value={application.client_id} readOnly />
            </Field>
            <Field>
              <Label>Name</Label>
              <Input
                name="name"
                defaultValue={application.name}
                required
                disabled={!canManage}
              />
            </Field>
            <Field>
              <Label>Status</Label>
              <Select
                name="status"
                defaultValue={application.status}
                disabled={!canManage}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </Field>
            <Field>
              <Label>Exact redirect URIs</Label>
              <Textarea
                name="redirect_uris"
                defaultValue={application.redirect_uris.join("\n")}
                required
                disabled={!canManage}
              />
            </Field>
            {canManage && (
              <div className="flex justify-end">
                <Button type="submit" color="coral" disabled={busy}>
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Version" description="Strong concurrency validator.">
            <div className="p-5">
              <Mono>ETag &quot;{application.version}&quot;</Mono>
              <Text className="mt-2">Updated {new Date(application.updated_at).toLocaleString()}</Text>
            </div>
          </Panel>
          {canManage && (
            <Panel title="Delete application" description="Client IDs are never reused.">
              <div className="p-5">
                <Button outline onClick={() => setDeleteOpen(true)}>
                  <TrashIcon /> Delete application
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>
      {application.application_type === "confidential" ? (
        <Panel
          className="mt-6"
          title="Client secrets"
          description="Keep at most two active credentials during a bounded overlap rotation. Values are shown only at creation."
          action={
            canManage ? (
              <Button
                color="coral"
                onClick={() => {
                  setCreatedSecret(null);
                  setSecretOpen(true);
                }}
              >
                <KeyIcon /> Create secret
              </Button>
            ) : undefined
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Credential</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Expires</TableHeader>
                <TableHeader>Last used</TableHeader>
                {canManage && (
                  <TableHeader>
                    <span className="sr-only">Action</span>
                  </TableHeader>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {secrets.map((secret) => (
                <TableRow key={secret.uid}>
                  <TableCell>
                    <div className="font-medium">{secret.name}</div>
                    <Mono className="mt-1 text-xs text-zinc-500">
                      {secret.prefix}
                    </Mono>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={secret.status} />
                  </TableCell>
                  <TableCell>{new Date(secret.expires_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {secret.last_used_at
                      ? new Date(secret.last_used_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {secret.status === "active" && (
                        <Button
                          plain
                          disabled={busy}
                          onClick={() => void revokeSecret(secret)}
                        >
                          <TrashIcon /> Revoke
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ) : (
        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-800/40">
          Public clients authenticate with their client ID and S256 PKCE. They
          never receive a client secret.
        </div>
      )}
      <OAuthApplicationGrants
        applicationUID={applicationUID}
        canManage={canManage}
      />
      <Dialog open={secretOpen || !!createdSecret} onClose={closeSecretDialog}>
        {createdSecret ? (
          <ClientSecretContent secret={createdSecret} close={closeSecretDialog} />
        ) : (
          <form onSubmit={createSecret}>
            <DialogTitle>Create client secret</DialogTitle>
            <DialogDescription>
              The default expiry is 90 days. Set an explicit earlier rotation
              deadline when your deployment can support it.
            </DialogDescription>
            <DialogBody className="grid gap-5">
              <Field>
                <Label>Name</Label>
                <Input name="name" required maxLength={100} />
              </Field>
              <Field>
                <Label>Expires at (optional)</Label>
                <Input name="expires_at" type="datetime-local" />
              </Field>
            </DialogBody>
            <DialogActions>
              <Button plain onClick={closeSecretDialog}>
                Cancel
              </Button>
              <Button type="submit" color="coral" disabled={busy}>
                {busy ? "Creating…" : "Create secret"}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete OAuth Application?"
        description="This tombstones the client ID and revokes its client secrets and server-tracked access tokens. The client ID cannot be reused."
        confirmLabel="Delete application"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void deleteApplication()}
      />
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}

function ClientSecretContent({
  secret,
  close,
}: {
  secret: OAuthClientSecretSecret;
  close: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(secret.secret);
    setCopied(true);
  }
  return (
    <>
      <DialogTitle>Copy this client secret now</DialogTitle>
      <DialogDescription>
        It is available only in this response and exact idempotent replays for
        24 hours. Store it in a backend secret manager.
      </DialogDescription>
      <DialogBody>
        <div className="rounded-lg bg-zinc-950 p-4 text-white">
          <Mono className="break-all text-zinc-200">{secret.secret}</Mono>
        </div>
        <Text className="mt-3">
          Prefix {secret.prefix} · expires {new Date(secret.expires_at).toLocaleString()}
        </Text>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={close}>
          I have saved it
        </Button>
        <Button color="coral" onClick={() => void copy()}>
          <ClipboardDocumentIcon /> {copied ? "Copied" : "Copy secret"}
        </Button>
      </DialogActions>
    </>
  );
}
