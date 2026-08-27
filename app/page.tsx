import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoltIcon,
  CheckIcon,
  CircleStackIcon,
  FingerPrintIcon,
  KeyIcon,
  LockClosedIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Authentication infrastructure, in focus",
  description:
    "Project-scoped authentication, passkeys, OAuth, service credentials, and audit controls in one focused platform.",
};

const capabilities = [
  {
    icon: FingerPrintIcon,
    eyebrow: "Strong by default",
    title: "Passwords never stand alone.",
    copy: "Require a verified passkey or security key before a management session becomes trusted.",
    accent: "coral",
  },
  {
    icon: RectangleGroupIcon,
    eyebrow: "Project isolation",
    title: "Every boundary has a name.",
    copy: "Keep users, origins, service accounts, policies, and activity scoped to the Project that owns them.",
    accent: "navy",
  },
  {
    icon: KeyIcon,
    eyebrow: "OAuth + OIDC",
    title: "Issue less. Verify more.",
    copy: "Short-lived RS256 tokens, rotating signing keys, online revocation, consent, and exact audience checks.",
    accent: "gold",
  },
  {
    icon: CircleStackIcon,
    eyebrow: "Operational truth",
    title: "State that survives the hard parts.",
    copy: "PostgreSQL-backed throttling, idempotency, audit trails, and leased background work across replicas.",
    accent: "green",
  },
] as const;

const trustPoints = [
  "Project-scoped service credentials",
  "Passkeys and security keys",
  "OAuth 2.0 and OpenID Connect",
  "Immutable activity history",
];

function StatusDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
      <span className="relative flex size-2">
        <span
          className={`${styles.ping} absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60`}
        />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}

function ConsolePreview() {
  return (
    <div
      className={`${styles.consoleShell} relative mx-auto w-full max-w-[680px]`}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#ff6b57]" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.08em] text-white/35 uppercase">
          <LockClosedIcon className="size-3" />
          Console
        </div>
      </div>

      <div className="grid min-h-[410px] grid-cols-[72px_1fr] sm:grid-cols-[148px_1fr]">
        <aside className="border-r border-white/8 bg-black/10 p-3 sm:p-4">
          <BrandMark className="mx-auto size-7 sm:mx-0" />
          <div className="mt-8 grid gap-2">
            {[
              ["Projects", true],
              ["Resources", false],
              ["OAuth apps", false],
              ["Activity", false],
            ].map(([label, active]) => (
              <div
                key={String(label)}
                className={`flex h-8 items-center rounded-lg px-2.5 text-[10px] font-medium ${
                  active ? "bg-white/10 text-white" : "text-white/35"
                }`}
              >
                <span
                  className={`mr-2 size-1.5 rounded-full ${active ? "bg-[#ff6b57]" : "bg-white/15"}`}
                />
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="overflow-hidden p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[#ff7968] uppercase">
                Project boundary
              </p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">
                Atlas production
              </h2>
            </div>
            <StatusDot label="Healthy" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["Assurance", "Strong"],
              ["Token TTL", "10 min"],
              ["Signing", "RS256"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/8 bg-white/[0.035] p-3 sm:p-4"
              >
                <p className="text-[9px] tracking-[0.08em] text-white/35 uppercase">
                  {label}
                </p>
                <p className="mt-1.5 text-xs font-semibold text-white sm:text-sm">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-white/8 bg-[#11152f] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">
                  Authentication activity
                </p>
                <p className="mt-1 text-[10px] text-white/35">
                  Last seven days
                </p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                All checks passed
              </span>
            </div>
            <div className="mt-6 flex h-20 items-end gap-1.5 sm:gap-2">
              {[38, 58, 46, 72, 55, 84, 66, 92, 75, 96, 82, 100].map(
                (height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className={`${styles.bar} flex-1 rounded-t-sm bg-gradient-to-t from-[#ef4835] to-[#ff8f80]`}
                    style={{
                      height: `${height}%`,
                      animationDelay: `${index * 45}ms`,
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-white/[0.06] text-[#ff7968]">
                <FingerPrintIcon className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-white">
                  Passkey challenge verified
                </p>
                <p className="mt-0.5 text-[9px] text-white/30">
                  User verification · 18 ms
                </p>
              </div>
            </div>
            <CheckIcon className="size-4 text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityCard({
  capability,
}: {
  capability: (typeof capabilities)[number];
}) {
  const Icon = capability.icon;
  return (
    <article
      className={`${styles.capabilityCard} group relative overflow-hidden rounded-[28px] border border-[#0e1129]/8 bg-white p-6 sm:p-8`}
    >
      <div className={`${styles.cardGlow} ${styles[capability.accent]}`} />
      <div className="relative">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#0e1129] text-white shadow-[0_12px_30px_rgba(14,17,41,0.16)] transition-transform duration-300 group-hover:-translate-y-1">
          <Icon className="size-5" />
        </span>
        <p className="mt-8 text-[11px] font-bold tracking-[0.12em] text-[#c93324] uppercase">
          {capability.eyebrow}
        </p>
        <h3 className="mt-3 max-w-sm text-2xl/7 font-semibold tracking-[-0.035em] text-[#0e1129] sm:text-[28px]/8">
          {capability.title}
        </h3>
        <p className="mt-4 max-w-md text-sm/6 text-zinc-600 sm:text-[15px]/7">
          {capability.copy}
        </p>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main
      className={`${styles.page} min-h-dvh overflow-hidden bg-[#f6f3ed] text-[#0e1129]`}
    >
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-md bg-white px-4 py-2 font-semibold text-[#0e1129] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="relative z-50 border-b border-[#0e1129]/7 bg-[#f6f3ed]/88 backdrop-blur-xl">
        <nav
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10"
          aria-label="Primary navigation"
        >
          <Link href="/" aria-label="ComplicatedAuth home">
            <BrandLogo className="text-[#0e1129]" />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#0e1129]/60 md:flex">
            <a
              className="transition-colors hover:text-[#0e1129]"
              href="#platform"
            >
              Platform
            </a>
            <a
              className="transition-colors hover:text-[#0e1129]"
              href="#architecture"
            >
              Architecture
            </a>
            <a
              className="transition-colors hover:text-[#0e1129]"
              href="#security"
            >
              Security
            </a>
            <a className="transition-colors hover:text-[#0e1129]" href="/docs/">
              Docs
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#0e1129] transition-colors hover:bg-white/70 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#0e1129] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(14,17,41,0.14)] transition-all hover:-translate-y-0.5 hover:bg-[#1a1e3f] sm:px-5"
            >
              Start building
              <ArrowUpRightIcon className="size-4" />
            </Link>
          </div>
        </nav>
      </header>

      <div id="main-content">
        <section
          className={`${styles.hero} relative border-b border-[#0e1129]/7`}
        >
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-10 lg:pt-28 lg:pb-32">
            <div className="relative z-10 max-w-2xl">
              <div
                className={`${styles.fadeUp} inline-flex items-center gap-2 rounded-full border border-[#0e1129]/10 bg-white/65 px-3 py-1.5 text-[11px] font-bold tracking-[0.09em] text-[#0e1129]/65 uppercase shadow-sm backdrop-blur`}
              >
                <span className="size-1.5 rounded-full bg-[#ef4835]" />
                Authentication infrastructure, in focus
              </div>
              <h1
                className={`${styles.fadeUp} ${styles.delayOne} mt-7 text-[clamp(3.25rem,7vw,6.75rem)]/[0.88] font-semibold tracking-[-0.068em] text-balance`}
              >
                Own the boundary.
                <span className="block text-[#ef4835]">
                  Lose the auth sprawl.
                </span>
              </h1>
              <p
                className={`${styles.fadeUp} ${styles.delayTwo} mt-7 max-w-xl text-lg/8 text-[#0e1129]/58 sm:text-xl/8`}
              >
                One focused control plane for passkeys, Projects, OAuth, service
                credentials, and the evidence behind every decision.
              </p>
              <div
                className={`${styles.fadeUp} ${styles.delayThree} mt-9 flex flex-col gap-3 sm:flex-row`}
              >
                <Link
                  href="/signup"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ef4835] px-6 text-sm font-bold text-white shadow-[0_14px_34px_rgba(239,72,53,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#dc3d2b]"
                >
                  Create your Tenant
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="/docs/getting-started/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#0e1129]/12 bg-white/60 px-6 text-sm font-bold text-[#0e1129] transition-all hover:-translate-y-0.5 hover:border-[#0e1129]/20 hover:bg-white"
                >
                  Read the docs
                  <ArrowUpRightIcon className="size-4" />
                </a>
              </div>
              <div
                className={`${styles.fadeUp} ${styles.delayFour} mt-9 flex flex-wrap gap-x-5 gap-y-3`}
              >
                {[
                  "No password-only admin sessions",
                  "No shared Project credentials",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#0e1129]/52"
                  >
                    <span className="grid size-4 place-items-center rounded-full bg-[#0e1129] text-white">
                      <CheckIcon className="size-2.5" />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={`${styles.previewWrap} relative lg:-mr-24 xl:-mr-32`}
            >
              <div className={styles.previewHalo} aria-hidden="true" />
              <ConsolePreview />
              <div
                className={`${styles.floatingBadge} ${styles.badgeTop} hidden items-center gap-2 rounded-2xl border border-white/65 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:flex`}
              >
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheckIcon className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-[#0e1129]">
                    Boundary verified
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">
                    Origin · audience · scope
                  </p>
                </div>
              </div>
              <div
                className={`${styles.floatingBadge} ${styles.badgeBottom} hidden items-center gap-2 rounded-2xl border border-white/65 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:flex`}
              >
                <span className="grid size-8 place-items-center rounded-xl bg-orange-50 text-[#ef4835]">
                  <KeyIcon className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-[#0e1129]">
                    Signing key active
                  </p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">
                    RS256 · JWKS published
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#0e1129]/7 bg-white/45">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-7 sm:px-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10 lg:px-10">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#0e1129]/38 uppercase">
              One boundary for
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2.5 text-xs font-semibold text-[#0e1129]/62"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-[#ef4835]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="platform"
          className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10"
        >
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold tracking-[0.13em] text-[#c93324] uppercase">
                The platform
              </p>
              <h2 className="mt-4 text-4xl/none font-semibold tracking-[-0.052em] text-balance sm:text-5xl/none">
                Security controls that read like decisions.
              </h2>
            </div>
            <p className="max-w-xl text-base/7 text-[#0e1129]/52 lg:justify-self-end lg:text-lg/8">
              ComplicatedAuth turns identity infrastructure into explicit,
              inspectable boundaries—so your team can reason about who is
              trusted, for what, and for how long.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {capabilities.map((capability) => (
              <CapabilityCard key={capability.title} capability={capability} />
            ))}
          </div>
        </section>

        <section
          id="architecture"
          className="relative overflow-hidden bg-[#0e1129] text-white"
        >
          <div className={styles.darkGrid} aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-16 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
            <div>
              <p className="text-[11px] font-bold tracking-[0.13em] text-[#ff7968] uppercase">
                A cleaner trust path
              </p>
              <h2 className="mt-4 max-w-lg text-4xl/none font-semibold tracking-[-0.052em] text-balance sm:text-5xl/none">
                Secrets stay on the server. Context stays intact.
              </h2>
              <p className="mt-6 max-w-lg text-base/7 text-white/52 sm:text-lg/8">
                Your BFF holds Project credentials and exchanges browser-safe
                references. The browser sees only what it needs; ComplicatedAuth
                enforces the rest.
              </p>
              <a
                href="/docs/architecture/"
                className="group mt-9 inline-flex items-center gap-2 text-sm font-bold text-white"
              >
                Explore the architecture
                <ArrowRightIcon className="size-4 text-[#ff7968] transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div
              className={`${styles.architecturePanel} rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-8`}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                {[
                  {
                    label: "Browser",
                    detail: "Opaque references",
                    icon: RectangleGroupIcon,
                  },
                  {
                    label: "Your BFF",
                    detail: "Credentials stay here",
                    icon: LockClosedIcon,
                  },
                  {
                    label: "ComplicatedAuth",
                    detail: "Policy + assurance",
                    icon: ShieldCheckIcon,
                  },
                ].map((node, index) => {
                  const Icon = node.icon;
                  return (
                    <div key={node.label} className="contents">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-center">
                        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/8 text-[#ff7968]">
                          <Icon className="size-5" />
                        </span>
                        <p className="mt-4 text-sm font-semibold text-white">
                          {node.label}
                        </p>
                        <p className="mt-1 text-[10px] text-white/35">
                          {node.detail}
                        </p>
                      </div>
                      {index < 2 && (
                        <div className="flex items-center justify-center py-1 text-[#ff7968] sm:px-1 sm:py-0">
                          <div
                            className={`${styles.flowLine} h-px w-8 bg-current sm:w-10`}
                          />
                          <ArrowRightIcon className="-ml-1 size-3.5 rotate-90 sm:rotate-0" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Exact origins", "Bound audiences", "Scoped credentials"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center justify-center gap-2 rounded-xl bg-black/15 px-3 py-3 text-[10px] font-semibold text-white/55"
                    >
                      <CheckIcon className="size-3 text-emerald-400" />
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="security"
          className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-10"
        >
          <div className="grid overflow-hidden rounded-[32px] bg-[#e9e3d9] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-12 lg:p-14">
              <p className="text-[11px] font-bold tracking-[0.13em] text-[#c93324] uppercase">
                Security is a system property
              </p>
              <h2 className="mt-4 max-w-xl text-4xl/none font-semibold tracking-[-0.052em] text-balance sm:text-5xl/none">
                Built for the moments that usually become exceptions.
              </h2>
              <p className="mt-6 max-w-xl text-base/7 text-[#0e1129]/55">
                Recovery revokes active sessions. Credential removal is
                auditable. Migrations are checksummed. Rate limits fail closed
                when their state is unavailable.
              </p>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {[
                  "Strong management assurance",
                  "Encrypted sensitive fields",
                  "Database-backed idempotency",
                  "Revocation-aware authorization",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[#0e1129]/8 bg-white/45 px-4 py-3.5 text-sm font-semibold"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0e1129] text-white">
                      <CheckIcon className="size-3.5" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div
              className={`${styles.securityVisual} relative min-h-[390px] overflow-hidden bg-[#ef4835] p-8 sm:min-h-[480px]`}
            >
              <div className={styles.securityRings} aria-hidden="true" />
              <div className="relative flex h-full min-h-[326px] items-center justify-center sm:min-h-[416px]">
                <div
                  className={`${styles.orbit} absolute size-[260px] rounded-full border border-white/25 sm:size-[340px]`}
                />
                <div
                  className={`${styles.orbit} ${styles.orbitTwo} absolute size-[190px] rounded-full border border-white/25 sm:size-[250px]`}
                />
                <div className="relative grid size-28 place-items-center rounded-[32px] border border-white/35 bg-white/95 text-[#0e1129] shadow-[0_30px_70px_rgba(98,20,11,0.28)] sm:size-36">
                  <ShieldCheckIcon className="size-12 sm:size-16" />
                </div>
                {[
                  ["top-[12%] left-[15%]", "Origin"],
                  ["top-[18%] right-[10%]", "Assurance"],
                  ["bottom-[15%] left-[9%]", "Audience"],
                  ["right-[13%] bottom-[10%]", "Scope"],
                ].map(([position, label]) => (
                  <span
                    key={label}
                    className={`absolute ${position} rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-[10px] font-bold tracking-[0.06em] text-white uppercase backdrop-blur`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
          <div
            className={`${styles.cta} relative mx-auto max-w-7xl overflow-hidden rounded-[34px] bg-[#0e1129] px-6 py-16 text-center text-white sm:px-12 sm:py-20`}
          >
            <div className={styles.ctaGlow} aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#ef4835] shadow-[0_14px_36px_rgba(239,72,53,0.26)]">
                <BoltIcon className="size-5" />
              </span>
              <h2 className="mt-7 text-4xl/none font-semibold tracking-[-0.052em] text-balance sm:text-6xl/none">
                Make every auth boundary obvious.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base/7 text-white/50 sm:text-lg/8">
                Create a Tenant, define your first Project, and put strong
                assurance between your users and production.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ef4835] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#dc3d2b]"
                >
                  Start building
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Sign in to console
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-[#0e1129]/7 bg-[#f6f3ed] text-[#0e1129]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <BrandLogo className="text-[#0e1129]" />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#0e1129]/45">
            <a className="hover:text-[#0e1129]" href="/docs/">
              Documentation
            </a>
            <a className="hover:text-[#0e1129]" href="/docs/security-model/">
              Security model
            </a>
            <Link className="hover:text-[#0e1129]" href="/login">
              Console
            </Link>
          </div>
          <p className="text-xs text-[#0e1129]/35">© 2026 ComplicatedAuth</p>
        </div>
      </footer>
    </main>
  );
}
