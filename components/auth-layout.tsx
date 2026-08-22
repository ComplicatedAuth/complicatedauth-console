import { BrandLogo } from "./brand-logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-[#fafaf9] text-zinc-950 dark:bg-zinc-950 dark:text-white lg:grid-cols-2">
      <aside className="auth-grid relative hidden min-h-dvh overflow-hidden bg-[#0e1129] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
        <div className="auth-glow absolute inset-0" />
        <BrandLogo className="relative z-10" />
        <div className="relative z-10 max-w-lg py-12">
          <p className="mb-5 text-xs font-bold tracking-[0.13em] text-[#ff6b57] uppercase">
            Auth infrastructure, in focus
          </p>
          <h1 className="text-4xl/none font-bold tracking-[-0.045em] text-balance xl:text-5xl/none">
            Every authentication boundary, isolated by design.
          </h1>
          <p className="mt-6 max-w-md text-base/7 text-white/55">
            Manage Projects, relying-party configuration, passkeys, service accounts,
            and audit trails in one focused console.
          </p>
          <div className="mt-9 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.08)]" />
            Project-scoped by design
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/25">
          © 2026 ComplicatedAuth Inc. · SOC 2 Type II · ISO 27001
        </p>
      </aside>
      <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
