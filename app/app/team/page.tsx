"use client";

import { PlusIcon, TrashIcon, UserGroupIcon } from "@heroicons/react/20/solid";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Toast } from "@/components/toast";
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
import { Field, Input, Label, Select } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  message,
  type Session,
  type TenantInvitation,
  type TenantMember,
  type TenantRole,
} from "@/lib/api";

type Page<T> = { items: T[]; next_cursor?: string | null };
const roles: TenantRole[] = ["owner", "admin", "developer", "support", "viewer"];
const invitationRoles: TenantRole[] = ["admin", "developer", "support", "viewer"];

export default function TeamPage() {
  const [session, setSession] = useState<Session | null>(null),
    [members, setMembers] = useState<TenantMember[]>([]),
    [invitations, setInvitations] = useState<TenantInvitation[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [inviteOpen, setInviteOpen] = useState(false),
    [remove, setRemove] = useState<TenantMember | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const current = await api<Session>("/v1/console/auth/session");
      const memberPage = await api<Page<TenantMember>>("/v1/tenant/members?limit=100");
      setSession(current);
      setMembers(memberPage.items);
      if (["owner", "admin"].includes(current.member.role)) {
        const invitationPage = await api<Page<TenantInvitation>>("/v1/tenant/invitations?limit=100");
        setInvitations(invitationPage.items);
      }
      setError("");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const canManage = !!session && ["owner", "admin"].includes(session.member.role);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<TenantInvitation>("/v1/tenant/invitations", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      setInviteOpen(false);
      setNotice("Invitation created. The acceptance link was emailed to the new member.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  function closeInvitationDialog() {
    setInviteOpen(false);
  }
  async function changeMember(member: TenantMember, values: { role?: TenantRole; status?: "active" | "disabled" }) {
    setBusy(true);
    try {
      await api(`/v1/tenant/members/${member.uid}`, { method: "PATCH", body: JSON.stringify(values) });
      setNotice("Tenant Member updated.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function removeMember() {
    if (!remove) return;
    setBusy(true);
    try {
      await api(`/v1/tenant/members/${remove.uid}`, { method: "DELETE" });
      setRemove(null);
      setNotice("Tenant Member removed.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }
  async function revokeInvitation(invitation: TenantInvitation) {
    setBusy(true);
    try {
      await api(`/v1/tenant/invitations/${invitation.uid}`, { method: "DELETE" });
      setNotice("Invitation revoked.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Workspace / Tenant members"
        title="People and access"
        description="Roles authorize every console request at the API. Disabling a member revokes all of their management sessions."
        actions={canManage ? <Button color="coral" onClick={() => setInviteOpen(true)}><PlusIcon />Invite member</Button> : undefined}
      />
      {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60">{error}</div>}
      {loading ? <div className="mt-8 h-72 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" /> : (
        <Panel className="mt-8" title="Tenant Members" description={`${members.length} loaded membership${members.length === 1 ? "" : "s"}`}>
          <Table>
            <TableHead><TableRow><TableHeader>Member</TableHeader><TableHeader>Role</TableHeader><TableHeader>Status</TableHeader><TableHeader>Verified</TableHeader>{canManage && <TableHeader><span className="sr-only">Actions</span></TableHeader>}</TableRow></TableHead>
            <TableBody>
              {members.map((member) => {
                const actorIsAdmin = session?.member.role === "admin";
                const editable = canManage && member.uid !== session?.member.uid && !(actorIsAdmin && member.role === "owner");
                return <TableRow key={member.uid}>
                  <TableCell><div className="font-medium">{member.display_name}</div><div className="text-xs text-zinc-500">{member.email}</div></TableCell>
                  <TableCell>{editable ? <Select aria-label={`Role for ${member.display_name}`} value={member.role} disabled={busy} onChange={(event) => void changeMember(member, { role: event.target.value as TenantRole })}>{roles.filter((role) => session?.member.role === "owner" || role !== "owner").map((role) => <option key={role} value={role}>{role}</option>)}</Select> : <Badge color={roleColor(member.role)}>{member.role}</Badge>}</TableCell>
                  <TableCell><StatusBadge value={member.status} /></TableCell>
                  <TableCell><Badge color={member.email_verified ? "green" : "amber"}>{member.email_verified ? "verified" : "unverified"}</Badge></TableCell>
                  {canManage && <TableCell className="text-right">{editable && <div className="flex justify-end gap-2"><Button outline disabled={busy} onClick={() => void changeMember(member, { status: member.status === "active" ? "disabled" : "active" })}>{member.status === "active" ? "Disable" : "Enable"}</Button><Button plain aria-label={`Remove ${member.display_name}`} disabled={busy} onClick={() => setRemove(member)}><TrashIcon /></Button></div>}</TableCell>}
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
      {canManage && invitations.length > 0 && (
        <Panel className="mt-6" title="Invitations" description="Acceptance links are delivered by email and never exposed to administrators.">
          <Table><TableHead><TableRow><TableHeader>Email</TableHeader><TableHeader>Role</TableHeader><TableHeader>Status</TableHeader><TableHeader>Expires</TableHeader><TableHeader><span className="sr-only">Actions</span></TableHeader></TableRow></TableHead>
            <TableBody>{invitations.map((invitation) => <TableRow key={invitation.uid}><TableCell>{invitation.email}</TableCell><TableCell><Badge color={roleColor(invitation.role)}>{invitation.role}</Badge></TableCell><TableCell><StatusBadge value={invitation.status} /></TableCell><TableCell>{new Date(invitation.expires_at).toLocaleDateString()}</TableCell><TableCell className="text-right">{invitation.status === "pending" && <Button plain disabled={busy} onClick={() => void revokeInvitation(invitation)}><TrashIcon />Revoke</Button>}</TableCell></TableRow>)}</TableBody>
          </Table>
        </Panel>
      )}
      {!canManage && !loading && <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-800/40"><UserGroupIcon className="mt-0.5 size-5 shrink-0" /><p>Your <strong>{session?.member.role}</strong> role can view membership but cannot invite, change, disable, or remove members.</p></div>}
      <Dialog open={inviteOpen} onClose={closeInvitationDialog}>
        <form onSubmit={invite}><DialogTitle>Invite a Tenant Member</DialogTitle><DialogDescription>A one-time acceptance link will be emailed to this address. It expires after seven days.</DialogDescription><DialogBody className="grid gap-5"><Field><Label>Email address</Label><Input name="email" type="email" required /></Field><Field><Label>Role</Label><Select name="role" defaultValue="viewer">{invitationRoles.map((role) => <option key={role} value={role}>{role}</option>)}</Select></Field></DialogBody><DialogActions><Button plain onClick={closeInvitationDialog}>Cancel</Button><Button type="submit" color="coral" disabled={busy}>{busy ? "Creating…" : "Send invitation"}</Button></DialogActions></form>
      </Dialog>
      <ConfirmDialog open={!!remove} title="Remove Tenant Member?" description={`This permanently removes ${remove?.display_name ?? "the member"} and revokes their sessions.`} confirmLabel="Remove member" onClose={() => setRemove(null)} onConfirm={() => void removeMember()} />
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}

function roleColor(role: string): "violet" | "blue" | "green" | "amber" | "zinc" {
  if (role === "owner") return "violet";
  if (role === "admin") return "blue";
  if (role === "developer") return "green";
  if (role === "support") return "amber";
  return "zinc";
}
