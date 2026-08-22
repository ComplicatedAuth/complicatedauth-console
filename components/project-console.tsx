"use client";

import {
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  GlobeAltIcon,
  KeyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type AuditEvent,
  message,
  type Origin,
  type Project,
  type ProjectUser,
  type ServiceAccount,
  type ServiceCredential,
  type ServiceCredentialSecret,
} from "@/lib/api";
import { ServiceAccountsView } from "./service-accounts-view";
import {
  EnvironmentBadge,
  MetricCard,
  PageHeading,
  Panel,
  StatusBadge,
} from "./console-ui";
import { Toast } from "./toast";
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
import { Description, Field, Input, Label, Select } from "./ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Mono, Text } from "./ui/typography";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "settings", label: "Settings" },
  { id: "service-accounts", label: "Service accounts" },
  { id: "users", label: "Users" },
  { id: "activity", label: "Activity" },
] as const;
type Section = (typeof sections)[number]["id"];
type Page<T> = { items: T[]; next_cursor?: string | null };
type Passkey = { uid: string; created_at: string };
type DetailedProjectUser = ProjectUser & { passkeys: Passkey[] };

export function ProjectConsole({
  projectUid,
  section,
}: {
  projectUid: string;
  section: string;
}) {
  const router = useRouter();
  const active = sections.some((item) => item.id === section)
    ? (section as Section)
    : "overview";
  const [project, setProject] = useState<Project | null>(null),
    [origins, setOrigins] = useState<Origin[]>([]),
    [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]),
    [serviceCredentials, setServiceCredentials] = useState<Record<string, ServiceCredential[]>>({}),
    [users, setUsers] = useState<ProjectUser[]>([]),
    [events, setEvents] = useState<AuditEvent[]>([]),
    [userNext, setUserNext] = useState(""),
    [eventNext, setEventNext] = useState(""),
    [error, setError] = useState(""),
    [secret, setSecret] = useState<ServiceCredentialSecret | null>(null),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const loadedProject = await api<Project>(`/v1/projects/${projectUid}`);
      setProject(loadedProject);
      setError("");
      if (active === "settings" || active === "overview")
        setOrigins(
          (await api<{ items: Origin[] }>(`/v1/projects/${projectUid}/origins`))
            .items,
        );
      if (active === "service-accounts") {
        const accountPage = await api<Page<ServiceAccount>>(
          `/v1/projects/${projectUid}/service-accounts`,
        );
        setServiceAccounts(accountPage.items);
        const credentialEntries = await Promise.all(
          accountPage.items.map(async (account) => [
            account.uid,
            (
              await api<{ items: ServiceCredential[] }>(
                `/v1/projects/${projectUid}/service-accounts/${account.uid}/credentials?limit=100`,
              )
            ).items,
          ] as const),
        );
        setServiceCredentials(Object.fromEntries(credentialEntries));
      }
      if (active === "users" || active === "overview") {
        const page = await api<Page<ProjectUser>>(
          `/v1/projects/${projectUid}/users`,
        );
        setUsers(page.items);
        setUserNext(page.next_cursor ?? "");
      }
      if (active === "activity" || active === "overview") {
        const page = await api<Page<AuditEvent>>(
          `/v1/projects/${projectUid}/activity`,
        );
        setEvents(page.items);
        setEventNext(page.next_cursor ?? "");
      }
    } catch (caught) {
      setError(message(caught));
    }
  }, [active, projectUid]);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function done(text: string) {
    setNotice(text);
    await load();
    router.refresh();
  }
  async function moreUsers() {
    if (!userNext) return;
    try {
      const page = await api<Page<ProjectUser>>(
        `/v1/projects/${projectUid}/users?cursor=${encodeURIComponent(userNext)}`,
      );
      setUsers((current) => [...current, ...page.items]);
      setUserNext(page.next_cursor ?? "");
    } catch (caught) {
      setError(message(caught));
    }
  }
  async function moreEvents() {
    if (!eventNext) return;
    try {
      const page = await api<Page<AuditEvent>>(
        `/v1/projects/${projectUid}/activity?cursor=${encodeURIComponent(eventNext)}`,
      );
      setEvents((current) => [...current, ...page.items]);
      setEventNext(page.next_cursor ?? "");
    } catch (caught) {
      setError(message(caught));
    }
  }
  if (!project && !error)
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
      </div>
    );
  if (!project)
    return (
      <div
        role="alert"
        className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60"
      >
        {error}
      </div>
    );
  return (
    <div className="-mx-6 -mt-6 lg:-mx-10 lg:-mt-10">
      <header className="border-b border-zinc-950/10 bg-white px-6 pt-6 text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white lg:px-10 lg:pt-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[#0e1129] text-sm font-extrabold text-white">
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-[-0.02em]">
                {project.name}
              </h1>
              <StatusBadge value={project.status} />
              <EnvironmentBadge value={project.environment} />
            </div>
            <Mono className="mt-1 block truncate text-zinc-500 dark:text-zinc-400">
              {project.uid}
            </Mono>
          </div>
        </div>
        <nav
          className="mt-6 flex gap-1 overflow-x-auto"
          aria-label="Project sections"
        >
          {sections.map((item) => (
            <Link
              key={item.id}
              href={`/app/projects/${project.uid}${item.id === "overview" ? "" : `/${item.id}`}`}
              className={`relative shrink-0 px-3 py-3 text-sm font-medium ${active === item.id ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
            >
              {item.label}
              {active === item.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#ef4835]" />
              )}
            </Link>
          ))}
        </nav>
      </header>
      <div className="px-6 py-8 lg:px-10 lg:py-10">
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {active === "overview" && (
          <Overview
            project={project}
            origins={origins}
            users={users}
            events={events}
          />
        )}
        {active === "settings" && (
          <SettingsView
            project={project}
            origins={origins}
            onDone={done}
            onError={setError}
          />
        )}
        {active === "service-accounts" && (
          <ServiceAccountsView
            projectUid={projectUid}
            accounts={serviceAccounts}
            credentials={serviceCredentials}
            onSecret={setSecret}
            onDone={done}
            onError={setError}
          />
        )}
        {active === "users" && (
          <UsersView
            projectUid={projectUid}
            users={users}
            onDone={done}
            onError={setError}
          />
        )}
        {active === "users" && userNext && (
          <div className="mt-5 text-center">
            <Button outline onClick={moreUsers}>
              Load more users
            </Button>
          </div>
        )}
        {active === "activity" && <ActivityView events={events} />}
        {active === "activity" && eventNext && (
          <div className="mt-5 text-center">
            <Button outline onClick={moreEvents}>
              Load more activity
            </Button>
          </div>
        )}
      </div>
      <SecretDialog secret={secret} close={() => setSecret(null)} />
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}

function Overview({
  project,
  origins,
  users,
  events,
}: {
  project: Project;
  origins: Origin[];
  users: ProjectUser[];
  events: AuditEvent[];
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Project overview"
        title={project.name}
        description="Everything that defines this authentication boundary, at a glance."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={<UserGroupIcon />}
          value={project.user_count}
          label="Project users"
          note={`${users.filter((user) => user.status === "active").length} loaded active`}
        />
        <MetricCard
          icon={<GlobeAltIcon />}
          value={project.origin_count}
          label="Allowed origins"
          note="Exact-match validation"
        />
        <MetricCard
          icon={<KeyIcon />}
          value={project.service_account_count}
          label="Active service accounts"
          note="Scoped workload identities"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel
          title="WebAuthn configuration"
          action={
            <Button href={`/app/projects/${project.uid}/settings`} plain>
              Settings →
            </Button>
          }
        >
          <dl className="grid gap-5 p-5">
            <Config label="RP ID">
              <div className="flex items-center gap-2">
                <Mono>{project.rp_id}</Mono>
                {project.rp_id_locked && (
                  <LockClosedIcon className="size-3.5 text-zinc-500 dark:text-zinc-400" />
                )}
              </div>
            </Config>
            <Config label="RP name">{project.rp_name}</Config>
            <Config label="Origins">
              <div className="mt-2 grid gap-2">
                {origins.map((origin, index) => (
                  <div
                    key={origin.uid}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <GlobeAltIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                    <Mono className="truncate">{origin.origin}</Mono>
                    {index === 0 && <Badge color="violet">Primary</Badge>}
                  </div>
                ))}
              </div>
            </Config>
            {project.rp_id_locked && (
              <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm/6 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/40">
                <LockClosedIcon className="mt-0.5 size-4" />
                RP ID is permanently locked because a passkey has been
                registered.
              </div>
            )}
          </dl>
        </Panel>
        <Panel
          title="Recent activity"
          action={
            <Button href={`/app/projects/${project.uid}/activity`} plain>
              View all →
            </Button>
          }
        >
          <div className="divide-y divide-zinc-950/5 dark:divide-white/5">
            {events.slice(0, 5).map((event) => (
              <EventRow key={event.uid} event={event} compact />
            ))}
            {events.length === 0 && (
              <Text className="p-5">No activity recorded yet.</Text>
            )}
          </div>
        </Panel>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-[#0e1129] p-6 text-white">
        <div>
          <h2 className="font-semibold">Connect your application backend</h2>
          <p className="mt-1 text-sm/6 text-white/55">
            Use a scoped, expiring service credential for user provisioning,
            authentication, and session operations.
          </p>
        </div>
        <Button
          href={`/app/projects/${project.uid}/service-accounts`}
          outline
          className="border-white/20 bg-transparent text-white hover:bg-white/5"
        >
          Manage service accounts
        </Button>
      </div>
    </div>
  );
}

function Config({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1 text-xs font-semibold tracking-[0.06em] text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-950 dark:text-white">{children}</dd>
    </div>
  );
}

function SettingsView({
  project,
  origins,
  onDone,
  onError,
}: {
  project: Project;
  origins: Origin[];
  onDone: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const [saving, setSaving] = useState(false),
    [removeTarget, setRemoveTarget] = useState<Origin | null>(null),
    [adding, setAdding] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/v1/projects/${project.uid}`, {
        method: "PATCH",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      await onDone("Project settings saved");
    } catch (caught) {
      onError(message(caught));
    } finally {
      setSaving(false);
    }
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setAdding(true);
    try {
      await api(`/v1/projects/${project.uid}/origins`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      await onDone("Origin added");
    } catch (caught) {
      onError(message(caught));
    } finally {
      setAdding(false);
    }
  }
  async function remove() {
    if (!removeTarget) return;
    try {
      await api(`/v1/projects/${project.uid}/origins/${removeTarget.uid}`, {
        method: "DELETE",
      });
      setRemoveTarget(null);
      await onDone("Origin removed");
    } catch (caught) {
      onError(message(caught));
      setRemoveTarget(null);
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        eyebrow="Settings"
        title="Project configuration"
        description="Authoritative relying-party and lifecycle settings."
      />
      <form onSubmit={save} className="mt-7 grid gap-5">
        <Panel title="Project identity">
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Project name</Label>
              <Input name="name" defaultValue={project.name} />
            </Field>
            <Field>
              <Label>Environment</Label>
              <Select name="environment" defaultValue={project.environment}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </Select>
            </Field>
            <Field>
              <Label>Status</Label>
              <Select name="status" defaultValue={project.status}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </Field>
          </div>
        </Panel>
        <Panel title="Relying party">
          <div className="grid gap-6 p-5">
            <Field>
              <Label>RP ID</Label>
              <div className="relative">
                <Input
                  name="rp_id"
                  defaultValue={project.rp_id}
                  disabled={project.rp_id_locked}
                  className="pr-10 font-mono"
                />
                {project.rp_id_locked && (
                  <LockClosedIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                )}
              </div>
              {project.rp_id_locked && (
                <Description className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/40">
                  <strong>RP ID is permanently locked.</strong> Removing
                  passkeys will not unlock it.
                </Description>
              )}
            </Field>
            <Field>
              <Label>RP name</Label>
              <Input name="rp_name" defaultValue={project.rp_name} />
              <Description>
                The human-readable name shown during WebAuthn ceremonies.
              </Description>
            </Field>
          </div>
        </Panel>
        <div className="flex justify-end">
          <Button type="submit" color="coral" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
      <Panel
        id="origins"
        title="Origins"
        description="WebAuthn ceremonies must originate from one of these exact values."
        className="mt-6"
      >
        <form onSubmit={add} className="flex flex-col gap-3 p-5 sm:flex-row">
          <Field className="flex-1">
            <Label>Add an Origin</Label>
            <Input
              name="origin"
              type="url"
              required
              placeholder="https://app.example.com"
              className="font-mono"
            />
          </Field>
          <Button
            type="submit"
            color="coral"
            disabled={adding}
            className="sm:self-end"
          >
            <PlusIcon />
            {adding ? "Adding…" : "Add Origin"}
          </Button>
        </form>
        <div className="divide-y divide-zinc-950/5 border-t border-zinc-950/10 dark:divide-white/5 dark:border-white/10">
          {origins.map((origin, index) => (
            <div key={origin.uid} className="flex items-center gap-3 px-5 py-4">
              <GlobeAltIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Mono className="truncate">{origin.origin}</Mono>
                  {index === 0 && <Badge color="violet">Primary</Badge>}
                </div>
                <Text className="mt-0.5">
                  Added {formatDate(origin.created_at)}
                </Text>
              </div>
              <Button
                plain
                aria-label={`Remove ${origin.origin}`}
                disabled={origins.length === 1}
                onClick={() => setRemoveTarget(origin)}
              >
                <TrashIcon className="text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </Panel>
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove Origin?"
        description={`WebAuthn ceremonies from ${removeTarget?.origin ?? "this Origin"} will immediately begin to fail.`}
        confirmLabel="Remove Origin"
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}

function SecretDialog({
  secret,
  close,
}: {
  secret: ServiceCredentialSecret | null;
  close: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function handleClose() {
    setCopied(false);
    close();
  }
  if (!secret) return null;
  return (
    <Dialog open onClose={handleClose} size="lg">
      <DialogTitle>Copy this service credential now</DialogTitle>
      <DialogDescription>
        This one-time secret will never be shown again. Save it in a server-side
        secret manager.
      </DialogDescription>
      <DialogBody>
        <div className="secret-value flex items-center gap-2 rounded-xl bg-zinc-100 p-3 dark:bg-white/5">
          <Mono className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">
            {secret?.secret}
          </Mono>
          <Button
            color={copied ? "green" : "coral"}
            onClick={() => {
              navigator.clipboard
                .writeText(secret.secret)
                .catch(() => undefined);
              setCopied(true);
            }}
          >
            <ClipboardDocumentIcon />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm/6 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/40">
          Never commit this credential to source control or expose it in browser code.
        </div>
      </DialogBody>
      <DialogActions>
        <Button outline onClick={handleClose}>
          I have saved the credential
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function UsersView({
  projectUid,
  users,
  onDone,
  onError,
}: {
  projectUid: string;
  users: ProjectUser[];
  onDone: (text: string) => Promise<void>;
  onError: (text: string) => void;
}) {
  const [selected, setSelected] = useState<DetailedProjectUser | null>(null),
    [query, setQuery] = useState(""),
    [confirmPasskey, setConfirmPasskey] = useState<Passkey | null>(null),
    [creating, setCreating] = useState(false);
  const filtered = useMemo(
    () =>
      users.filter((user) =>
        `${user.email} ${user.uid}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, users],
  );
  async function inspect(uid: string) {
    try {
      setSelected(
        await api<DetailedProjectUser>(
          `/v1/projects/${projectUid}/users/${uid}`,
        ),
      );
    } catch (caught) {
      onError(message(caught));
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCreating(true);
    try {
      await api(`/v1/projects/${projectUid}/users`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      await onDone("Project User created");
    } catch (caught) {
      onError(message(caught));
    } finally {
      setCreating(false);
    }
  }
  async function patch(body: object, text: string) {
    if (!selected) return;
    try {
      await api(`/v1/projects/${projectUid}/users/${selected.uid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await onDone(text);
      await inspect(selected.uid);
    } catch (caught) {
      onError(message(caught));
    }
  }
  async function updateIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await patch(
      {
        email: new FormData(event.currentTarget).get("email"),
        email_verified: selected?.email_verified,
      },
      "User identity updated",
    );
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    try {
      await api(`/v1/projects/${projectUid}/users/${selected.uid}/password`, {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      await onDone("Password replaced and sessions revoked");
    } catch (caught) {
      onError(message(caught));
    }
  }
  async function revokeSessions() {
    if (!selected) return;
    try {
      await api(
        `/v1/projects/${projectUid}/users/${selected.uid}/sessions/revoke`,
        { method: "POST" },
      );
      await onDone("All user sessions revoked");
    } catch (caught) {
      onError(message(caught));
    }
  }
  async function removePasskey() {
    if (!selected || !confirmPasskey) return;
    try {
      await api(
        `/v1/projects/${projectUid}/users/${selected.uid}/passkeys/${confirmPasskey.uid}`,
        { method: "DELETE" },
      );
      setConfirmPasskey(null);
      await onDone("Passkey removed");
      await inspect(selected.uid);
    } catch (caught) {
      onError(message(caught));
      setConfirmPasskey(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Users"
        title="Project users"
        description="Email is unique inside this Project and has no identity meaning outside it."
      />
      <Panel title="Create Project user" className="mt-7">
        <form
          onSubmit={create}
          className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]"
        >
          <Field>
            <Label>Email address</Label>
            <Input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
            />
          </Field>
          <Field>
            <Label>
              Initial password{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                optional
              </span>
            </Label>
            <Input
              name="password"
              type="password"
              minLength={12}
              placeholder="At least 12 characters"
            />
          </Field>
          <Button
            type="submit"
            color="coral"
            disabled={creating}
            className="md:self-end"
          >
            <UserPlusIcon />
            {creating ? "Creating…" : "Create user"}
          </Button>
        </form>
      </Panel>
      <div className="relative mt-5 max-w-md">
        <MagnifyingGlassIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email or user ID"
          className="pl-10"
        />
      </div>
      <Panel className="mt-5">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>User</TableHeader>
              <TableHeader>Verification</TableHeader>
              <TableHeader>Passkeys</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>
                  <div className="font-medium">{user.email}</div>
                  <Mono
                    data-testid="user-uid"
                    className="text-zinc-500 dark:text-zinc-400"
                  >
                    {user.uid}
                  </Mono>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    value={user.email_verified ? "verified" : "unverified"}
                  />
                </TableCell>
                <TableCell>{user.passkey_count}</TableCell>
                <TableCell>
                  <StatusBadge value={user.status} />
                </TableCell>
                <TableCell className="text-zinc-500 dark:text-zinc-400">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    plain
                    onClick={() => inspect(user.uid)}
                    aria-label={`Open ${user.email}`}
                  >
                    <EllipsisHorizontalIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <Text className="p-8 text-center">No matching users.</Text>
        )}
      </Panel>
      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        size="2xl"
      >
        <DialogTitle>{selected?.email}</DialogTitle>
        <DialogDescription>{selected?.uid}</DialogDescription>
        {selected && (
          <DialogBody>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5 dark:bg-white/5 dark:ring-white/10">
              <Config label="Status">
                <StatusBadge value={selected.status} />
              </Config>
              <Config label="Email">
                <StatusBadge
                  value={selected.email_verified ? "verified" : "unverified"}
                />
              </Config>
              <Config label="Passkeys">
                <strong className="text-lg">{selected.passkey_count}</strong>
              </Config>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Panel title="Identity">
                <form onSubmit={updateIdentity} className="grid gap-4 p-4">
                  <Field>
                    <Label>Email address</Label>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={selected.email}
                      required
                    />
                  </Field>
                  <Button type="submit" outline>
                    Save identity
                  </Button>
                  <Button
                    type="button"
                    plain
                    onClick={() =>
                      patch(
                        { email_verified: !selected.email_verified },
                        selected.email_verified
                          ? "Email marked unverified"
                          : "Email marked verified",
                      )
                    }
                  >
                    <ShieldCheckIcon />
                    Mark {selected.email_verified ? "unverified" : "verified"}
                  </Button>
                </form>
              </Panel>
              <Panel title="Authentication">
                <form onSubmit={password} className="grid gap-4 p-4">
                  <Field>
                    <Label>Replacement password</Label>
                    <Input
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      placeholder="At least 12 characters"
                    />
                    <Description>
                      Replacing the password revokes active sessions.
                    </Description>
                  </Field>
                  <Button type="submit" outline>
                    Replace password
                  </Button>
                  <Button type="button" plain onClick={revokeSessions}>
                    Revoke all sessions
                  </Button>
                </form>
              </Panel>
            </div>
            <Panel
              title={`Passkeys (${selected.passkeys.length})`}
              className="mt-5"
            >
              <div className="divide-y divide-zinc-950/5 dark:divide-white/5">
                {selected.passkeys.map((passkey) => (
                  <div
                    key={passkey.uid}
                    className="flex items-center gap-3 p-4"
                  >
                    <KeyIcon className="size-5 text-zinc-500 dark:text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <Mono className="block truncate">{passkey.uid}</Mono>
                      <Text>Added {formatDate(passkey.created_at)}</Text>
                    </div>
                    <Button
                      plain
                      aria-label={`Remove passkey ${passkey.uid}`}
                      onClick={() => setConfirmPasskey(passkey)}
                    >
                      <TrashIcon className="text-red-500" />
                    </Button>
                  </div>
                ))}
                {selected.passkeys.length === 0 && (
                  <Text className="p-4">No passkeys registered.</Text>
                )}
              </div>
            </Panel>
            <div className="mt-5 flex justify-end">
              <Button
                color={selected.status === "active" ? "red" : "green"}
                onClick={() =>
                  patch(
                    {
                      status:
                        selected.status === "active" ? "disabled" : "active",
                    },
                    selected.status === "active"
                      ? "User disabled"
                      : "User enabled",
                  )
                }
              >
                {selected.status === "active" ? "Disable user" : "Enable user"}
              </Button>
            </div>
          </DialogBody>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirmPasskey !== null}
        title="Remove passkey?"
        description="The user will need to register another passkey. The Project RP ID remains permanently locked."
        confirmLabel="Remove passkey"
        onClose={() => setConfirmPasskey(null)}
        onConfirm={removePasskey}
      />
    </div>
  );
}

function ActivityView({ events }: { events: AuditEvent[] }) {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading
        eyebrow="Activity"
        title="Security audit trail"
        description="All security-relevant events scoped to this authentication boundary."
      />
      <Panel className="mt-7">
        <div className="divide-y divide-zinc-950/5 dark:divide-white/5">
          {events.map((event) => (
            <EventRow key={event.uid} event={event} />
          ))}
          {events.length === 0 && (
            <Text className="p-8 text-center">No activity recorded yet.</Text>
          )}
        </div>
      </Panel>
    </div>
  );
}

function EventRow({
  event,
  compact = false,
}: {
  event: AuditEvent;
  compact?: boolean;
}) {
  const Icon =
    event.action.includes("key") ||
    event.action.includes("passkey") ||
    event.action.includes("password")
      ? KeyIcon
      : event.action.includes("origin")
        ? GlobeAltIcon
        : event.action.includes("user")
          ? UserGroupIcon
          : Cog6ToothIcon;
  return (
    <div
      className={`flex items-center gap-3 ${compact ? "px-5 py-3" : "px-5 py-4"}`}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {formatAction(event.action)}
          </span>
          <Badge
            color={
              event.actor_type === "tenant_member"
                ? "violet"
                : event.actor_type === "service_account"
                  ? "blue"
                  : "zinc"
            }
          >
            {event.actor_type.replace("_", " ")}
          </Badge>
        </div>
        <Mono className="mt-0.5 block truncate text-zinc-500 dark:text-zinc-400">
          {event.target_type ?? "system"}
          {event.target_uid ? ` · ${event.target_uid}` : ""}
        </Mono>
      </div>
      <Mono className="shrink-0 text-zinc-500 dark:text-zinc-400 max-sm:hidden">
        {compact
          ? new Date(event.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : formatDateTime(event.created_at)}
      </Mono>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function formatAction(value: string) {
  return value
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" · ");
}
