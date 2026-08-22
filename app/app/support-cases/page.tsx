"use client";

import { InboxStackIcon, PlusIcon } from "@heroicons/react/20/solid";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeading, Panel, StatusBadge } from "@/components/console-ui";
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
  type Project,
  type SupportCase,
} from "@/lib/api";

type Page<T> = { items: T[]; next_cursor: string | null };

export default function SupportCasesPage() {
  const [cases, setCases] = useState<SupportCase[] | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [status, setStatus] = useState(""),
    [category, setCategory] = useState(""),
    [projectUID, setProjectUID] = useState(""),
    [createOpen, setCreateOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  const load = useCallback(async (cursor?: string) => {
    try {
      const query = new URLSearchParams({ limit: "50" });
      if (status) query.set("status", status);
      if (category) query.set("category", category);
      if (projectUID) query.set("project_uid", projectUID);
      if (cursor) query.set("cursor", cursor);
      const [page, projectPage] = await Promise.all([
        api<Page<SupportCase>>(`/v1/support/cases?${query}`),
        api<Page<Project>>("/v1/projects?limit=100"),
      ]);
      setCases((current) => cursor && current ? [...current, ...page.items] : page.items);
      setNextCursor(page.next_cursor);
      setProjects(projectPage.items);
      setError("");
    } catch (caught) {
      setError(message(caught));
    }
  }, [category, projectUID, status]);

  useEffect(() => {
    // The inbox query is external state synchronized to these filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.uid, project.name])),
    [projects],
  );

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const selectedProject = String(data.get("project_uid") ?? "");
      await api<SupportCase>("/v1/support/cases", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          ...(selectedProject ? { project_uid: selectedProject } : {}),
          category: data.get("category"),
          subject: data.get("subject"),
          message: data.get("message"),
          priority: data.get("priority"),
          diagnostic_consent: false,
        }),
      });
      form.reset();
      setCreateOpen(false);
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Workspace / Support"
        title="Support cases"
        description="Triage customer questions, feedback, and bugs across the Tenant. Public correspondence and internal operator notes remain separate, while every lifecycle change is immutable and audited."
        actions={
          <Button color="coral" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Create case
          </Button>
        }
      />
      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900">
          {error}
        </div>
      )}
      <Panel className="mt-8" title="Operator inbox" description="Filters are exact and combine together. Most recently changed cases appear first.">
        <div className="grid gap-4 border-b border-zinc-950/10 p-5 sm:grid-cols-3 dark:border-white/10">
          <Field>
            <Label>Status</Label>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_for_customer">Waiting for customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field>
            <Label>Category</Label>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              <option value="bug">Bug</option>
              <option value="feedback">Feedback</option>
              <option value="question">Question</option>
            </Select>
          </Field>
          <Field>
            <Label>Project</Label>
            <Select value={projectUID} onChange={(event) => setProjectUID(event.target.value)}>
              <option value="">All Projects</option>
              {projects.map((project) => <option key={project.uid} value={project.uid}>{project.name}</option>)}
            </Select>
          </Field>
        </div>
        {cases === null ? (
          <div className="h-72 animate-pulse bg-zinc-100 dark:bg-white/5" />
        ) : cases.length === 0 ? (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div><InboxStackIcon className="mx-auto size-10 text-zinc-400" /><p className="mt-3 font-medium">No matching Support Cases</p><Text className="mt-1">New customer intake will appear here.</Text></div>
          </div>
        ) : (
          <>
            <Table>
              <TableHead><TableRow><TableHeader>Case</TableHeader><TableHeader>Category</TableHeader><TableHeader>Project</TableHeader><TableHeader>Status</TableHeader><TableHeader>Priority</TableHeader><TableHeader>Updated</TableHeader><TableHeader><span className="sr-only">Open</span></TableHeader></TableRow></TableHead>
              <TableBody>
                {cases.map((item) => (
                  <TableRow key={item.uid}>
                    <TableCell><div className="font-medium">{item.subject}</div><Mono className="mt-1 text-xs text-zinc-500">{item.reference}</Mono></TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell>{item.project_uid ? projectNames.get(item.project_uid) ?? "Project" : "Tenant"}</TableCell>
                    <TableCell><StatusBadge value={item.status} /></TableCell>
                    <TableCell className="capitalize">{item.priority}</TableCell>
                    <TableCell>{new Date(item.updated_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><Button outline href={`/app/support-cases/${item.uid}`}>Open</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {nextCursor && <div className="flex justify-center border-t border-zinc-950/10 p-4 dark:border-white/10"><Button outline onClick={() => void load(nextCursor)}>Load more</Button></div>}
          </>
        )}
      </Panel>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={createCase}>
          <DialogTitle>Create Support Case</DialogTitle>
          <DialogDescription>Create a Tenant-level case or associate it with one Project. The first message is immutable.</DialogDescription>
          <DialogBody className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><Label>Project</Label><Select name="project_uid"><option value="">Tenant-level</option>{projects.map((project) => <option key={project.uid} value={project.uid}>{project.name}</option>)}</Select></Field>
              <Field><Label>Category</Label><Select name="category" defaultValue="question"><option value="question">Question</option><option value="feedback">Feedback</option><option value="bug">Bug</option></Select></Field>
              <Field><Label>Priority</Label><Select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></Select></Field>
            </div>
            <Field><Label>Subject</Label><Input name="subject" required maxLength={200} /></Field>
            <Field><Label>Initial message</Label><Textarea name="message" required maxLength={10000} /></Field>
          </DialogBody>
          <DialogActions><Button plain onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" color="coral" disabled={busy}>{busy ? "Creating…" : "Create case"}</Button></DialogActions>
        </form>
      </Dialog>
    </div>
  );
}
