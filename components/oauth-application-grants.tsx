"use client";

import { KeyIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/20/solid";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Panel, StatusBadge } from "@/components/console-ui";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Label, Select } from "@/components/ui/field";
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
  type OAuthApplicationGrant,
  type ResourceServer,
  type ResourceServerScope,
} from "@/lib/api";

type List<T> = { items: T[] };

export function OAuthApplicationGrants({
  applicationUID,
  canManage,
}: {
  applicationUID: string;
  canManage: boolean;
}) {
  const [grants, setGrants] = useState<OAuthApplicationGrant[] | null>(null),
    [servers, setServers] = useState<ResourceServer[]>([]),
    [availableScopes, setAvailableScopes] = useState<ResourceServerScope[] | null>(null),
    [selectedServerUID, setSelectedServerUID] = useState(""),
    [editing, setEditing] = useState<OAuthApplicationGrant | null>(null),
    [dialogOpen, setDialogOpen] = useState(false),
    [deleting, setDeleting] = useState<OAuthApplicationGrant | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [grantList, serverPage] = await Promise.all([
        api<List<OAuthApplicationGrant>>(
          `/v1/oauth/applications/${applicationUID}/grants`,
        ),
        api<List<ResourceServer>>("/v1/resource-servers?limit=100"),
      ]);
      setGrants(grantList.items);
      setServers(serverPage.items);
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

  async function selectResourceServer(resourceServerUID: string) {
    setSelectedServerUID(resourceServerUID);
    setAvailableScopes(null);
    if (!resourceServerUID) return;
    try {
      const result = await api<List<ResourceServerScope>>(
        `/v1/resource-servers/${resourceServerUID}/scopes`,
      );
      setAvailableScopes(
        result.items.filter((scope) => scope.status === "active"),
      );
    } catch (caught) {
      setError(message(caught));
      setAvailableScopes([]);
    }
  }

  function startCreate() {
    setEditing(null);
    const granted = new Set((grants ?? []).map((grant) => grant.resource_server_uid));
    const resourceServerUID =
      servers.find(
        (server) => server.status === "active" && !granted.has(server.uid),
      )?.uid ?? "";
    setDialogOpen(true);
    void selectResourceServer(resourceServerUID);
  }

  function startEdit(grant: OAuthApplicationGrant) {
    setEditing(grant);
    setDialogOpen(true);
    void selectResourceServer(grant.resource_server_uid);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scopeUIDs = form.getAll("scope_uids").map(String);
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await api(
          `/v1/oauth/applications/${applicationUID}/grants/${editing.uid}`,
          {
            method: "PATCH",
            headers: { "If-Match": `"${editing.version}"` },
            body: JSON.stringify({ scope_uids: scopeUIDs }),
          },
        );
      } else {
        await api(`/v1/oauth/applications/${applicationUID}/grants`, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            resource_server_uid: selectedServerUID,
            scope_uids: scopeUIDs,
          }),
        });
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(message(caught));
      if (editing) await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteGrant() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(
        `/v1/oauth/applications/${applicationUID}/grants/${deleting.uid}`,
        {
          method: "DELETE",
          headers: { "If-Match": `"${deleting.version}"` },
        },
      );
      setDeleting(null);
      await load();
    } catch (caught) {
      setError(message(caught));
      setDeleting(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const granted = new Set((grants ?? []).map((grant) => grant.resource_server_uid));
  const creatable = servers.some(
    (server) => server.status === "active" && !granted.has(server.uid),
  );

  return (
    <>
      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <Panel
        className="mt-6"
        title="Resource Server grants"
        description="Administrative scope assignments are the upper bound; Tenant Member consent can only narrow them."
        action={
          canManage && creatable ? (
            <Button color="coral" onClick={startCreate}>
              <KeyIcon /> Add grant
            </Button>
          ) : undefined
        }
      >
        {grants === null ? (
          <div className="h-44 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : grants.length === 0 ? (
          <div className="grid min-h-44 place-items-center px-6 text-center">
            <Text>
              No delegated API access. Register a Resource Server and explicitly
              assign scopes before this client can request them.
            </Text>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Resource Server</TableHeader>
                <TableHeader>Granted scopes</TableHeader>
                <TableHeader>Status</TableHeader>
                {canManage && <TableHeader><span className="sr-only">Actions</span></TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grant.uid}>
                  <TableCell>
                    <div className="font-medium">{grant.resource_server_name}</div>
                    <Mono className="mt-1 text-xs text-zinc-500">{grant.resource_server_identifier}</Mono>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {grant.scopes.map((scope) => <Mono key={scope} className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-white/10">{scope}</Mono>)}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge value={grant.status} /></TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button plain onClick={() => startEdit(grant)}><PencilSquareIcon /> Change scopes</Button>
                        <Button plain onClick={() => setDeleting(grant)}><TrashIcon /> Delete</Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <form onSubmit={save}>
          <DialogTitle>{editing ? "Change delegated scopes" : "Add Resource Server grant"}</DialogTitle>
          <DialogDescription>
            Tokens may request only this exact audience and a subset of the checked scopes.
            Changing a grant revokes outstanding server-tracked tokens for this client and audience.
          </DialogDescription>
          <DialogBody className="grid gap-5">
            <Field>
              <Label>Resource Server</Label>
              <Select
                value={selectedServerUID}
                disabled={!!editing}
                required
                onChange={(event) => {
                  void selectResourceServer(event.target.value);
                }}
              >
                <option value="" disabled>Select a Resource Server</option>
                {servers
                  .filter((server) => editing?.resource_server_uid === server.uid || (server.status === "active" && !granted.has(server.uid)))
                  .map((server) => <option key={server.uid} value={server.uid}>{server.name}</option>)}
              </Select>
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Delegated scopes</legend>
              {availableScopes === null ? (
                <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-white/5" />
              ) : availableScopes.length === 0 ? (
                <Text>This Resource Server has no active scopes.</Text>
              ) : (
                availableScopes.map((scope) => (
                  <label key={scope.uid} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                    <input
                      type="checkbox"
                      name="scope_uids"
                      value={scope.uid}
                      defaultChecked={editing?.scopes.includes(scope.name)}
                      className="mt-1 size-4 accent-[#ef4835]"
                    />
                    <span>
                      <Mono>{scope.name}</Mono>
                      <span className="mt-1 block text-sm text-zinc-500">{scope.display_name}</span>
                    </span>
                  </label>
                ))
              )}
            </fieldset>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" color="coral" disabled={busy || !selectedServerUID || !availableScopes?.length}>
              {busy ? "Saving…" : editing ? "Save scopes" : "Add grant"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.resource_server_name ?? "grant"} access?`}
        description="This tombstones the client/audience grant and revokes its outstanding server-tracked tokens. A later replacement requires explicit configuration and fresh user authorization."
        confirmLabel="Delete grant"
        onClose={() => setDeleting(null)}
        onConfirm={() => void deleteGrant()}
      />
    </>
  );
}
