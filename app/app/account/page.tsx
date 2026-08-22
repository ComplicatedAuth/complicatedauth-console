"use client";

import {
  CheckIcon,
  ComputerDesktopIcon,
  IdentificationIcon,
  KeyIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
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
  type OAuthConsent,
  type TenantMemberSession,
  type TenantMemberWebAuthnCredential,
} from "@/lib/api";
import {
  defaultCredentialName,
  enrollTenantMemberCredential,
  type WebAuthnMode,
} from "@/lib/console-webauthn";

type Page<T> = { items: T[]; next_cursor?: string | null };

export default function AccountPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<TenantMemberSession[] | null>(null),
    [consents, setConsents] = useState<OAuthConsent[] | null>(null),
    [credentials, setCredentials] = useState<TenantMemberWebAuthnCredential[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [enrollmentName, setEnrollmentName] = useState(""),
    [editingCredential, setEditingCredential] = useState(""),
    [credentialName, setCredentialName] = useState("");
  const load = useCallback(async () => {
    try {
      const [sessionPage, consentPage, credentialList] = await Promise.all([
        api<Page<TenantMemberSession>>(
          "/v1/console/auth/sessions?limit=100",
        ),
        api<Page<OAuthConsent>>("/v1/oauth/consents?limit=100"),
        api<{ items: TenantMemberWebAuthnCredential[] }>(
          "/v1/console/webauthn-credentials",
        ),
      ]);
      setSessions(sessionPage.items);
      setConsents(consentPage.items);
      setCredentials(credentialList.items);
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

  async function enrollCredential(mode: WebAuthnMode) {
    setBusy(`enroll:${mode}`);
    setError("");
    try {
      await enrollTenantMemberCredential({
        name: enrollmentName.trim() || defaultCredentialName(mode),
        mode,
      });
      setEnrollmentName("");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function renameCredential(credential: TenantMemberWebAuthnCredential) {
    setBusy(`rename:${credential.uid}`);
    setError("");
    try {
      await api(`/v1/console/webauthn-credentials/${credential.uid}`, {
        method: "PATCH",
        headers: { "If-Match": `"${credential.version}"` },
        body: JSON.stringify({ name: credentialName }),
      });
      setEditingCredential("");
      setCredentialName("");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function deleteCredential(credential: TenantMemberWebAuthnCredential) {
    setBusy(`delete:${credential.uid}`);
    setError("");
    try {
      await api(`/v1/console/webauthn-credentials/${credential.uid}`, {
        method: "DELETE",
        headers: { "If-Match": `"${credential.version}"` },
      });
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function revokeSession(session: TenantMemberSession) {
    setBusy(session.uid);
    try {
      await api(`/v1/console/auth/sessions/${session.uid}`, {
        method: "DELETE",
      });
      if (session.current) {
        router.push("/login");
        router.refresh();
        return;
      }
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function revokeConsent(consent: OAuthConsent) {
    setBusy(consent.uid);
    try {
      await api(`/v1/oauth/consents/${consent.uid}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Account / Security"
        title="Authenticators, sessions, and connected applications"
        description="Maintain user-verified management credentials and review active access. Passwords never create a management session by themselves."
      />
      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}
      <Panel
        className="mt-8"
        title="Passkeys and security keys"
        description="Keep at least one credential enrolled. Add a replacement before removing an old authenticator; removing one also revokes your other management sessions."
      >
        <div className="grid gap-3 border-b border-zinc-950/10 p-5 sm:grid-cols-[1fr_auto_auto] dark:border-white/10">
          <Input
            aria-label="New authenticator name"
            value={enrollmentName}
            onChange={(event) => setEnrollmentName(event.target.value)}
            maxLength={100}
            placeholder="Authenticator name"
          />
          <Button
            outline
            disabled={busy !== ""}
            onClick={() => void enrollCredential("passkey")}
          >
            <ShieldCheckIcon />
            {busy === "enroll:passkey" ? "Creating…" : "Add passkey"}
          </Button>
          <Button
            outline
            disabled={busy !== ""}
            onClick={() => void enrollCredential("security_key")}
          >
            <KeyIcon />
            {busy === "enroll:security_key" ? "Waiting…" : "Add security key"}
          </Button>
        </div>
        {credentials === null ? (
          <div className="h-48 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Authenticator</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Last used</TableHeader>
                <TableHeader>Added</TableHeader>
                <TableHeader><span className="sr-only">Actions</span></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {credentials.map((credential) => (
                <TableRow key={credential.uid}>
                  <TableCell>
                    {editingCredential === credential.uid ? (
                      <div className="flex min-w-64 items-center gap-2">
                        <Input
                          aria-label="Authenticator name"
                          value={credentialName}
                          onChange={(event) => setCredentialName(event.target.value)}
                          maxLength={100}
                        />
                        <Button
                          plain
                          aria-label="Save authenticator name"
                          disabled={!credentialName.trim() || busy !== ""}
                          onClick={() => void renameCredential(credential)}
                        >
                          <CheckIcon />
                        </Button>
                        <Button
                          plain
                          aria-label="Cancel authenticator rename"
                          disabled={busy !== ""}
                          onClick={() => setEditingCredential("")}
                        >
                          <XMarkIcon />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{credential.name}</div>
                        <Mono className="mt-1 text-xs text-zinc-500">{credential.uid}</Mono>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={credential.kind === "passkey" ? "blue" : "zinc"}>
                      {credential.kind === "passkey" ? "Passkey" : "Security key"}
                    </Badge>
                    {credential.attested && <div className="mt-1 text-xs text-zinc-500">Attested</div>}
                  </TableCell>
                  <TableCell>
                    {credential.last_used_at
                      ? new Date(credential.last_used_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>{new Date(credential.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {editingCredential !== credential.uid && (
                      <div className="flex justify-end gap-1">
                        <Button
                          plain
                          disabled={busy !== ""}
                          onClick={() => {
                            setEditingCredential(credential.uid);
                            setCredentialName(credential.name);
                          }}
                        >
                          <PencilSquareIcon /> Rename
                        </Button>
                        <Button
                          plain
                          disabled={busy !== "" || credentials.length === 1}
                          title={credentials.length === 1 ? "Add a replacement before removing the final credential" : undefined}
                          onClick={() => void deleteCredential(credential)}
                        >
                          <TrashIcon /> Remove
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Panel className="mt-8" title="Active management sessions">
        {sessions === null ? (
          <div className="h-48 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Session</TableHeader>
                <TableHeader>Last seen</TableHeader>
                <TableHeader>Expires</TableHeader>
                <TableHeader><span className="sr-only">Action</span></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.uid}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ComputerDesktopIcon className="size-5 text-zinc-500" />
                      <span>{session.current ? "This session" : "Console session"}</span>
                    </div>
                    <Mono className="mt-1 text-xs text-zinc-500">{session.uid}</Mono>
                  </TableCell>
                  <TableCell>{new Date(session.last_seen_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(session.expires_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button plain disabled={busy === session.uid} onClick={() => void revokeSession(session)}>
                      <TrashIcon /> Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Panel
        className="mt-6"
        title="Connected OAuth applications"
        description="Revoking consent invalidates every server-tracked access token and requires explicit approval next time."
      >
        {consents === null ? (
          <div className="h-48 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : consents.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-6 text-center">
            <div>
              <IdentificationIcon className="mx-auto size-8 text-zinc-400" />
              <p className="mt-3 font-medium">No connected applications</p>
              <Text className="mt-1">OAuth grants will appear here.</Text>
            </div>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Application</TableHeader>
                <TableHeader>Scopes</TableHeader>
                <TableHeader>Audience</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Updated</TableHeader>
                <TableHeader><span className="sr-only">Action</span></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {consents.map((consent) => (
                <TableRow key={consent.uid}>
                  <TableCell>
                    <div className="font-medium">{consent.application_name}</div>
                    <Mono className="mt-1 text-xs text-zinc-500">{consent.client_id}</Mono>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {consent.scopes.map((scope) => <Badge key={scope} color="blue">{scope}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {consent.resource_server_name ? (
                      <div>
                        <div className="font-medium">{consent.resource_server_name}</div>
                        <Mono className="mt-1 text-xs text-zinc-500">{consent.resource_server_identifier}</Mono>
                      </div>
                    ) : (
                      "UserInfo"
                    )}
                  </TableCell>
                  <TableCell><StatusBadge value={consent.status} /></TableCell>
                  <TableCell>{new Date(consent.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {consent.status === "active" && (
                      <Button plain disabled={busy === consent.uid} onClick={() => void revokeConsent(consent)}>
                        <TrashIcon /> Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
