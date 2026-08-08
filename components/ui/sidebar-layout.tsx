"use client";

import * as Headless from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

export function SidebarLayout({
  sidebar,
  mobileBrand,
  children,
}: {
  sidebar: React.ReactNode;
  mobileBrand: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative isolate flex min-h-dvh w-full bg-[#efede9] max-lg:flex-col dark:bg-zinc-950">
      <div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>
      <Headless.Dialog open={open} onClose={setOpen} className="lg:hidden">
        <Headless.DialogBackdrop
          transition
          className="fixed inset-0 z-40 bg-[#0e1129]/40 transition data-closed:opacity-0"
        />
        <Headless.DialogPanel
          transition
          className="fixed inset-y-0 left-0 z-50 w-full max-w-80 p-2 transition data-closed:-translate-x-full"
        >
          <div
            className="relative h-full overflow-hidden rounded-xl bg-[#0e1129] shadow-2xl"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <button
              className="absolute top-3 right-3 z-10 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <XMarkIcon className="size-5" />
            </button>
            {sidebar}
          </div>
        </Headless.DialogPanel>
      </Headless.Dialog>
      <header className="flex h-14 items-center border-b border-zinc-950/10 bg-white px-4 lg:hidden dark:border-white/10 dark:bg-zinc-900">
        <button
          className="mr-3 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Bars3Icon className="size-5" />
        </button>
        {mobileBrand}
      </header>
      <main className="flex min-w-0 flex-1 flex-col pb-2 lg:pt-2 lg:pr-2 lg:pl-64">
        <div className="min-h-0 grow bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 lg:rounded-xl lg:p-10 dark:bg-zinc-900 dark:ring-white/10">
          {children}
        </div>
      </main>
    </div>
  );
}
