"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  LinkIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
import { Toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type SupportCase,
  type SupportCaseAttachment,
  type SupportCaseEvent,
  type SupportCaseExternalReference,
  type SupportCaseMessage,
  type TenantMember,
} from "@/lib/api";

type Page<T> = { items: T[]; next_cursor: string | null };

export default function SupportCasePage() {
  const caseUID = useParams<{ caseUid: string }>().caseUid;
  const [supportCase, setSupportCase] = useState<SupportCase | null>(null),
    [messages, setMessages] = useState<SupportCaseMessage[]>([]),
    [attachments, setAttachments] = useState<SupportCaseAttachment[]>([]),
    [events, setEvents] = useState<SupportCaseEvent[]>([]),
    [references, setReferences] = useState<SupportCaseExternalReference[]>([]),
    [members, setMembers] = useState<TenantMember[]>([]),
    [messageCursor, setMessageCursor] = useState<string | null>(null),
    [eventCursor, setEventCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [caseValue, messagePage, attachmentPage, eventPage, referencePage, memberPage] = await Promise.all([
        api<SupportCase>(`/v1/support/cases/${caseUID}`),
        api<Page<SupportCaseMessage>>(`/v1/support/cases/${caseUID}/messages?limit=100`),
        api<Page<SupportCaseAttachment>>(`/v1/support/cases/${caseUID}/attachments?limit=100`),
        api<Page<SupportCaseEvent>>(`/v1/support/cases/${caseUID}/events?limit=100`),
        api<Page<SupportCaseExternalReference>>(`/v1/support/cases/${caseUID}/external-references?limit=100`),
        api<Page<TenantMember>>("/v1/tenant/members?limit=100"),
      ]);
      setSupportCase(caseValue);
      setMessages(messagePage.items);
      setAttachments(attachmentPage.items);
      setEvents(eventPage.items);
      setReferences(referencePage.items);
      setMembers(memberPage.items);
      setMessageCursor(messagePage.next_cursor);
      setEventCursor(eventPage.next_cursor);
      setError("");
    } catch (caught) {
      setError(message(caught));
    }
  }, [caseUID]);

  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function loadMoreMessages() {
    if (!messageCursor) return;
    const page = await api<Page<SupportCaseMessage>>(`/v1/support/cases/${caseUID}/messages?limit=100&cursor=${encodeURIComponent(messageCursor)}`);
    setMessages((current) => [...current, ...page.items]);
    setMessageCursor(page.next_cursor);
  }

  async function loadMoreEvents() {
    if (!eventCursor) return;
    const page = await api<Page<SupportCaseEvent>>(`/v1/support/cases/${caseUID}/events?limit=100&cursor=${encodeURIComponent(eventCursor)}`);
    setEvents((current) => [...current, ...page.items]);
    setEventCursor(page.next_cursor);
  }

  async function updateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supportCase) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const updated = await api<SupportCase>(`/v1/support/cases/${caseUID}`, {
        method: "PATCH",
        headers: { "If-Match": `"${supportCase.version}"` },
        body: JSON.stringify({
          subject: data.get("subject"),
          category: data.get("category"),
          status: data.get("status"),
          priority: data.get("priority"),
          assignee_member_uid: data.get("assignee_member_uid") || null,
        }),
      });
      setSupportCase(updated);
      setNotice("Support Case updated.");
      await load();
    } catch (caught) {
      setError(message(caught));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api(`/v1/support/cases/${caseUID}/messages`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ body: data.get("body"), visibility: data.get("visibility") }),
      });
      form.reset();
      setNotice("Message added.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api(`/v1/support/cases/${caseUID}/attachments`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: data,
      });
      form.reset();
      setNotice("Attachment encrypted and stored.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function createReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api(`/v1/support/cases/${caseUID}/external-references`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ provider: data.get("provider"), external_id: data.get("external_id"), url: data.get("url"), label: data.get("label") }),
      });
      form.reset();
      setNotice("External reference linked.");
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteReference(uid: string) {
    setBusy(true);
    try {
      await api(`/v1/support/cases/${caseUID}/external-references/${uid}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!supportCase) {
    return <div className="mx-auto max-w-7xl">{error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div> : <div className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />}</div>;
  }

  const terminal = supportCase.status === "resolved" || supportCase.status === "closed";
  const assignable = members.filter((member) => member.status === "active" && ["owner", "admin", "support"].includes(member.role));

  return (
    <div className="mx-auto max-w-7xl">
      <Button plain href="/app/support-cases" className="mb-5 -ml-3"><ArrowLeftIcon /> Support cases</Button>
      <PageHeading
        eyebrow={`Support / ${supportCase.reference}`}
        title={supportCase.subject}
        description="Public customer correspondence, internal operator context, attachment custody, external coordination, and lifecycle history remain independently inspectable."
        actions={<StatusBadge value={supportCase.status} />}
      />
      {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900">{error}</div>}
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="grid content-start gap-6">
          <Panel title="Conversation" description="Internal notes are never visible through Project service credentials.">
            <div className="divide-y divide-zinc-950/10 dark:divide-white/10">
              {messages.map((item) => (
                <article key={item.uid} className={item.visibility === "internal" ? "bg-amber-50/70 p-5 dark:bg-amber-950/20" : "p-5"}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><span className="font-medium capitalize">{item.author.type.replaceAll("_", " ")}</span>{item.visibility === "internal" && <Badge color="amber">Internal</Badge>}</div>
                    <Text>{new Date(item.created_at).toLocaleString()}</Text>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm/6 text-zinc-800 dark:text-zinc-200">{item.body}</p>
                  <Mono className="mt-3 text-xs text-zinc-500">{item.author.uid}</Mono>
                </article>
              ))}
            </div>
            {messageCursor && <div className="flex justify-center border-t border-zinc-950/10 p-4 dark:border-white/10"><Button outline onClick={() => void loadMoreMessages()}>Load older page</Button></div>}
            <form onSubmit={createMessage} className="grid gap-4 border-t border-zinc-950/10 p-5 dark:border-white/10">
              <Field><Label>Reply or note</Label><Textarea name="body" required maxLength={10000} disabled={terminal} /></Field>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <Field className="min-w-52"><Label>Visibility</Label><Select name="visibility" defaultValue="public" disabled={terminal}><option value="public">Public reply</option><option value="internal">Internal note</option></Select></Field>
                <Button type="submit" color="coral" disabled={busy || terminal}><PaperAirplaneIcon /> Add message</Button>
              </div>
              {terminal && <Text>Reopen the case before adding correspondence.</Text>}
            </form>
          </Panel>

          <Panel title="Attachments" description="Files are encrypted at rest and always downloaded as untrusted attachments.">
            {attachments.length === 0 ? <div className="p-5"><Text>No attachments.</Text></div> : (
              <Table><TableHead><TableRow><TableHeader>File</TableHeader><TableHeader>Type</TableHeader><TableHeader>Size</TableHeader><TableHeader>Digest</TableHeader><TableHeader><span className="sr-only">Download</span></TableHeader></TableRow></TableHead><TableBody>{attachments.map((item) => <TableRow key={item.uid}><TableCell><div className="flex items-center gap-2 font-medium"><PaperClipIcon className="size-4" />{item.filename}</div></TableCell><TableCell>{item.media_type}</TableCell><TableCell>{item.byte_count.toLocaleString()} bytes</TableCell><TableCell><Mono className="text-xs">{item.sha256.slice(0, 16)}…</Mono></TableCell><TableCell className="text-right"><Button outline href={`/api/v1/support/cases/${caseUID}/attachments/${item.uid}/content`}><ArrowDownTrayIcon /> Download</Button></TableCell></TableRow>)}</TableBody></Table>
            )}
            <form onSubmit={uploadAttachment} className="flex flex-wrap items-end gap-4 border-t border-zinc-950/10 p-5 dark:border-white/10">
              <Field className="min-w-64 flex-1"><Label>Upload file</Label><Input name="file" type="file" required disabled={terminal} accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,application/json" /></Field>
              <Button type="submit" outline disabled={busy || terminal}><PaperClipIcon /> Upload</Button>
            </form>
          </Panel>

          <Panel title="Immutable activity" description="Events contain routing facts and state transitions, never encrypted customer content.">
            <div className="divide-y divide-zinc-950/10 dark:divide-white/10">{events.map((item) => <div key={item.uid} className="grid gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_auto]"><div><div className="flex items-center gap-2"><span className="font-medium">{item.type}</span>{item.visibility === "internal" && <Badge color="amber">Internal</Badge>}</div><Mono className="mt-1 text-xs text-zinc-500">{JSON.stringify(item.payload)}</Mono></div><Text>{new Date(item.created_at).toLocaleString()}</Text></div>)}</div>
            {eventCursor && <div className="flex justify-center border-t border-zinc-950/10 p-4 dark:border-white/10"><Button outline onClick={() => void loadMoreEvents()}>Load more activity</Button></div>}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Triage">
            <form onSubmit={updateCase} className="grid gap-5 p-5">
              <Field><Label>Subject</Label><Input name="subject" defaultValue={supportCase.subject} required maxLength={200} /></Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field><Label>Category</Label><Select name="category" defaultValue={supportCase.category}><option value="bug">Bug</option><option value="feedback">Feedback</option><option value="question">Question</option></Select></Field>
                <Field><Label>Priority</Label><Select name="priority" defaultValue={supportCase.priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></Select></Field>
                <Field><Label>Status</Label><Select name="status" defaultValue={supportCase.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_for_customer">Waiting for customer</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select></Field>
                <Field><Label>Assignee</Label><Select name="assignee_member_uid" defaultValue={supportCase.assignee_member_uid ?? ""}><option value="">Unassigned</option>{assignable.map((member) => <option key={member.uid} value={member.uid}>{member.display_name}</option>)}</Select></Field>
              </div>
              <div className="flex justify-end"><Button type="submit" color="coral" disabled={busy}>Save triage</Button></div>
              <Text>Case ETag &quot;{supportCase.version}&quot;</Text>
            </form>
          </Panel>

          <Panel title="Reporter and diagnostics">
            <dl className="grid gap-4 p-5 text-sm">
              <div><dt className="text-zinc-500">Reporter</dt><dd className="mt-1 capitalize">{supportCase.reporter.type.replaceAll("_", " ")}</dd><dd><Mono className="text-xs">{supportCase.reporter.uid}</Mono></dd></div>
              <div><dt className="text-zinc-500">Project</dt><dd className="mt-1"><Mono>{supportCase.project_uid ?? "Tenant-level"}</Mono></dd></div>
              <div><dt className="text-zinc-500">Diagnostics consent</dt><dd className="mt-1">{supportCase.diagnostic_consent ? "Granted" : "Not granted"}</dd></div>
              {supportCase.diagnostics && Object.entries(supportCase.diagnostics).map(([key, value]) => <div key={key}><dt className="text-zinc-500">{key.replaceAll("_", " ")}</dt><dd className="mt-1 break-all">{String(value)}</dd></div>)}
            </dl>
          </Panel>

          <Panel title="External references" description="Generic coordination links are operator-only and never grant authority.">
            <div className="divide-y divide-zinc-950/10 dark:divide-white/10">{references.map((item) => <div key={item.uid} className="flex items-start justify-between gap-3 p-5"><div><div className="font-medium">{item.label || item.external_id}</div><Mono className="mt-1 text-xs">{item.provider} · {item.external_id}</Mono>{item.url && <a className="mt-1 block text-sm text-[#c93324] underline" href={item.url} target="_blank" rel="noreferrer">Open external record</a>}</div><Button plain onClick={() => void deleteReference(item.uid)} disabled={busy}><TrashIcon /><span className="sr-only">Unlink</span></Button></div>)}</div>
            <form onSubmit={createReference} className="grid gap-4 border-t border-zinc-950/10 p-5 dark:border-white/10">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Field><Label>Provider</Label><Input name="provider" required pattern="[a-z][a-z0-9._-]{0,62}" placeholder="issue_tracker" /></Field><Field><Label>External ID</Label><Input name="external_id" required maxLength={255} /></Field></div>
              <Field><Label>Safe URL</Label><Input name="url" type="url" placeholder="https://tracker.example/cases/123" /></Field>
              <Field><Label>Label</Label><Input name="label" maxLength={100} /></Field>
              <Button type="submit" outline disabled={busy}><LinkIcon /> Link record</Button>
            </form>
          </Panel>

          <Panel title="Retention">
            <div className="p-5"><Text>{supportCase.retention_until ? `Scheduled for deletion after ${new Date(supportCase.retention_until).toLocaleString()}. Reopening clears the schedule.` : "Retention countdown begins only when the case is closed."}</Text></div>
          </Panel>
        </div>
      </div>
      <Toast message={notice} onClose={() => setNotice("")} />
    </div>
  );
}
