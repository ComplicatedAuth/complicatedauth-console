"use client";

import { IdentificationIcon, PlusIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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
  type OAuthApplicationType,
  type Session,
} from "@/lib/api";

type ApplicationPage = {
  items: OAuthApplication[];
  next_cursor?: string | null;
};

export default function OAuthApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<OAuthApplication[] | null>(
      null,
    ),
    [session, setSession] = useState<Session | null>(null),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [current, page] = await Promise.all([
        api<Session>("/v1/console/auth/session"),
        api<ApplicationPage>("/v1/oauth/applications?limit=100"),
      ]);
      setSession(current);
      setApplications(page.items);
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
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const redirectURIs = String(form.get("redirect_uris") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      const application = await api<OAuthApplication>(
        "/v1/oauth/applications",
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            name: form.get("name"),
            application_type: form.get(
              "application_type",
            ) as OAuthApplicationType,
            redirect_uris: redirectURIs,
          }),
        },
      );
      setOpen(false);
      router.push(`/app/oauth-applications/${application.uid}`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Workspace / OAuth"
        title="OAuth applications"
        description="Register standards-based clients independently of Projects. Redirects are exact, client types are immutable, and reusable credentials have a separate lifecycle."
        actions={
          canManage ? (
            <Button color="coral" onClick={() => setOpen(true)}>
              <PlusIcon /> Register application
            </Button>
          ) : undefined
        }
      />
      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60"
        >
          {error}
        </div>
      )}
      <Panel
        className="mt-8"
        title="Registered clients"
        description="Client IDs are public identifiers. Client-secret values never appear in this collection."
      >
        {applications === null ? (
          <div className="h-64 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : applications.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <IdentificationIcon className="mx-auto size-9 text-zinc-400" />
              <p className="mt-3 font-medium">No OAuth applications yet</p>
              <Text className="mt-1">
                Register a public browser client or confidential backend client.
              </Text>
            </div>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Application</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Redirects</TableHeader>
                <TableHeader>
                  <span className="sr-only">Open</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.uid}>
                  <TableCell>
                    <div className="font-medium">{application.name}</div>
                    <Mono className="mt-1 text-xs text-zinc-500">
                      {application.client_id}
                    </Mono>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        application.application_type === "confidential"
                          ? "violet"
                          : "blue"
                      }
                    >
                      {application.application_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={application.status} />
                  </TableCell>
                  <TableCell>{application.redirect_uris.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      outline
                      href={`/app/oauth-applications/${application.uid}`}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      {!canManage && session && (
        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-800/40">
          Your <strong>{session.member.role}</strong> role may inspect OAuth
          Applications but cannot register or change them.
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={create}>
          <DialogTitle>Register OAuth application</DialogTitle>
          <DialogDescription>
            Public clients use PKCE without a secret. Confidential clients keep
            credentials only in a trusted backend.
          </DialogDescription>
          <DialogBody className="grid gap-5">
            <Field>
              <Label>Name</Label>
              <Input name="name" required maxLength={120} />
            </Field>
            <Field>
              <Label>Application type</Label>
              <Select name="application_type" defaultValue="confidential">
                <option value="confidential">Confidential backend</option>
                <option value="public">Public browser or native client</option>
              </Select>
            </Field>
            <Field>
              <Label>Exact redirect URIs</Label>
              <Textarea
                name="redirect_uris"
                required
                placeholder={"https://app.example.com/oauth/callback\nhttp://localhost:3001/callback"}
              />
              <Text>One URI per line. HTTPS is required outside local development.</Text>
            </Field>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" color="coral" disabled={busy}>
              {busy ? "Registering…" : "Register application"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
