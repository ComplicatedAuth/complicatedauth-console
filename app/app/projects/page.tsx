"use client";

import {
  ArrowRightIcon,
  GlobeAltIcon,
  KeyIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EnvironmentBadge,
  PageHeading,
  StatusBadge,
} from "@/components/console-ui";
import { Button } from "@/components/ui/button";
import { Mono, Text } from "@/components/ui/typography";
import { api, message, type Project } from "@/lib/api";

type Page = { items: Project[]; next_cursor?: string | null };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null),
    [next, setNext] = useState(""),
    [error, setError] = useState(""),
    [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    api<Page>("/v1/projects")
      .then((page) => {
        setProjects(page.items);
        setNext(page.next_cursor ?? "");
      })
      .catch((caught) => setError(message(caught)));
  }, []);
  async function more() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await api<Page>(
        `/v1/projects?cursor=${encodeURIComponent(next)}`,
      );
      setProjects((current) => [...(current ?? []), ...page.items]);
      setNext(page.next_cursor ?? "");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setLoadingMore(false);
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Workspace / Projects"
        title="Your authentication boundaries"
        description="Each Project is a fully isolated authentication environment. Users, credentials, and configuration never cross boundaries."
        actions={
          <Button href="/app/projects/new" color="coral">
            <PlusIcon />
            Create Project
          </Button>
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
      {projects === null && !error && (
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl bg-zinc-100 ring-1 ring-zinc-950/5 dark:bg-white/5 dark:ring-white/10"
            />
          ))}
        </div>
      )}
      {projects?.length === 0 && (
        <div className="mt-9 grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-20 text-center dark:border-zinc-700 dark:bg-white/[0.025]">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#fdecea] text-[#d93d2c] dark:bg-[#3b171a] dark:text-[#ff8879]">
            <KeyIcon className="size-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">
            Create your first Project
          </h2>
          <Text className="mt-2 max-w-md">
            Define an RP ID and Origin to establish an isolated authentication
            domain.
          </Text>
          <Button href="/app/projects/new" color="coral" className="mt-5">
            Start onboarding
          </Button>
        </div>
      )}
      {!!projects?.length && (
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.uid}
              href={`/app/projects/${project.uid}`}
              className="group flex min-w-0 flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-zinc-950/20 dark:bg-zinc-900 dark:ring-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0e1129] text-sm font-extrabold text-white">
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-zinc-950 dark:text-white">
                    {project.name}
                  </h2>
                  <div className="mt-1.5 flex gap-1.5">
                    <EnvironmentBadge value={project.environment} />
                    <StatusBadge value={project.status} />
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid gap-2">
                <div className="grid min-w-0 grid-cols-[3.5rem_1fr] gap-2">
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    UUID
                  </dt>
                  <dd className="truncate">
                    <Mono>{project.uid}</Mono>
                  </dd>
                </div>
                <div className="grid min-w-0 grid-cols-[3.5rem_1fr] gap-2">
                  <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    RP ID
                  </dt>
                  <dd className="truncate">
                    <Mono>{project.rp_id}</Mono>
                  </dd>
                </div>
              </dl>
              <dl className="mt-6 grid grid-cols-3 border-t border-zinc-950/10 pt-5 text-center dark:border-white/10">
                <div>
                  <dd className="text-xl font-bold">{project.origin_count}</dd>
                  <dt className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <GlobeAltIcon className="size-3" />
                    Origins
                  </dt>
                </div>
                <div>
                  <dd className="text-xl font-bold">{project.user_count}</dd>
                  <dt className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <UserGroupIcon className="size-3" />
                    Users
                  </dt>
                </div>
                <div>
                  <dd className="text-xl font-bold">{project.api_key_count}</dd>
                  <dt className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <KeyIcon className="size-3" />
                    Keys
                  </dt>
                </div>
              </dl>
              <span className="mt-5 flex items-center justify-end gap-1.5 text-sm font-semibold text-[#c93324] dark:text-[#ff8879]">
                Open project{" "}
                <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
      {next && (
        <div className="mt-7 text-center">
          <Button outline onClick={more} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more Projects"}
          </Button>
        </div>
      )}
    </div>
  );
}
