"use client";

import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  FolderIcon,
  IdentificationIcon,
  InboxStackIcon,
  PlusIcon,
  ServerStackIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, message, type Project, type Session } from "@/lib/api";
import { BrandLogo } from "./brand-logo";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from "./ui/dropdown";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarSection,
  SidebarSpacer,
} from "./ui/sidebar";
import { SidebarLayout } from "./ui/sidebar-layout";

export function AppShell({
  session,
  projects,
  children,
}: {
  session: Session;
  projects: Project[];
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [verificationBusy, setVerificationBusy] = useState(false),
    [verificationNotice, setVerificationNotice] = useState("");
  const canManageProjects = ["owner", "admin", "developer"].includes(
    session.member.role,
  );
  const canManageSupport = ["owner", "admin", "support"].includes(
    session.member.role,
  );
  async function logout() {
    await api("/v1/console/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  async function resendVerification() {
    setVerificationBusy(true);
    try {
      await api("/v1/console/email-verification-requests", { method: "POST", body: JSON.stringify({ email: session.member.email }) });
      setVerificationNotice("Verification email requested. Check your inbox.");
    } catch (caught) {
      setVerificationNotice(message(caught));
    } finally {
      setVerificationBusy(false);
    }
  }
  const sidebar = (
    <Sidebar className="bg-[#0e1129] text-white">
      <SidebarHeader>
        <div className="px-2 py-1">
          <BrandLogo />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ef4835] text-xs font-bold text-[#0e1129]">
            {session.tenant.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {session.tenant.name}
            </div>
            <div className="truncate text-xs text-zinc-400">
              {session.member.role} workspace
            </div>
          </div>
          <ChevronDownIcon className="size-4 text-zinc-400" />
        </div>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <SidebarItem
            href="/app/projects"
            current={pathname === "/app/projects"}
          >
            <Squares2X2Icon />
            All projects
          </SidebarItem>
          {canManageProjects && (
            <SidebarItem
              href="/app/projects/new"
              current={pathname === "/app/projects/new"}
            >
              <PlusIcon />
              Create project
            </SidebarItem>
          )}
          <SidebarItem href="/app/team" current={pathname === "/app/team"}>
            <UserGroupIcon />
            Tenant members
          </SidebarItem>
          <SidebarItem
            href="/app/oauth-applications"
            current={pathname.startsWith("/app/oauth-applications")}
          >
            <IdentificationIcon />
            OAuth applications
          </SidebarItem>
          <SidebarItem
            href="/app/resource-servers"
            current={pathname.startsWith("/app/resource-servers")}
          >
            <ServerStackIcon />
            Resource servers
          </SidebarItem>
          {canManageSupport && (
            <SidebarItem
              href="/app/support-cases"
              current={pathname.startsWith("/app/support-cases")}
            >
              <InboxStackIcon />
              Support cases
            </SidebarItem>
          )}
        </SidebarSection>
        <SidebarSection>
          <SidebarHeading>Projects</SidebarHeading>
          {projects.map((project) => (
            <SidebarItem
              key={project.uid}
              href={`/app/projects/${project.uid}`}
              current={pathname.startsWith(`/app/projects/${project.uid}`)}
            >
              <span className="grid size-5 place-items-center rounded bg-white/10 text-[0.6rem] font-bold text-white">
                {project.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              {project.environment === "sandbox" && (
                <span className="rounded bg-amber-300/15 px-1.5 text-[0.625rem] text-amber-300">
                  S
                </span>
              )}
            </SidebarItem>
          ))}
        </SidebarSection>
        <SidebarSpacer />
        <SidebarSection>
          <SidebarItem href="#">
            <FolderIcon />
            Documentation
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter>
        <Dropdown>
          <DropdownButton className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-zinc-300 hover:bg-white/5 hover:text-white">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#ef4835] text-xs font-bold text-[#0e1129]">
              {session.member.display_name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {session.member.display_name}
              </span>
              <span className="block truncate text-xs text-zinc-400">
                {session.member.email}
              </span>
            </span>
            <ChevronDownIcon className="size-4 text-zinc-400" />
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-64">
            <DropdownItem href="/app/account">
              <UserCircleIcon />
              My account
            </DropdownItem>
            <DropdownItem>
              <Cog6ToothIcon />
              Workspace settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={logout}>
              <ArrowRightStartOnRectangleIcon />
              Sign out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );
  return (
    <SidebarLayout
      sidebar={sidebar}
      mobileBrand={<BrandLogo className="text-[#0e1129] dark:text-white" />}
    >
      {!session.member.email_verified && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:ring-amber-800/50">
          <div className="flex items-center gap-2"><EnvelopeIcon className="size-5" /><span>{verificationNotice || "Verify your email address so account ownership is explicit."}</span></div>
          <button type="button" className="font-semibold underline disabled:opacity-50" disabled={verificationBusy} onClick={() => void resendVerification()}>{verificationBusy ? "Requesting…" : "Resend verification"}</button>
        </div>
      )}
      {children}
    </SidebarLayout>
  );
}
