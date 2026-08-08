"use client";

import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { forwardRef } from "react";

export function Field({
  className,
  ...props
}: Omit<Headless.FieldProps, "as" | "className"> & { className?: string }) {
  return (
    <Headless.Field {...props} className={clsx("grid gap-2", className)} />
  );
}
export function Label({
  className,
  ...props
}: Omit<Headless.LabelProps, "as" | "className"> & { className?: string }) {
  return (
    <Headless.Label
      {...props}
      className={clsx(
        "text-sm font-medium text-zinc-950 dark:text-white",
        className,
      )}
    />
  );
}
export function Description({
  className,
  ...props
}: Omit<Headless.DescriptionProps, "as" | "className"> & {
  className?: string;
}) {
  return (
    <Headless.Description
      {...props}
      className={clsx("text-sm/6 text-zinc-500 dark:text-zinc-400", className)}
    />
  );
}
export function ErrorMessage({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      role="alert"
      {...props}
      className={clsx("text-sm/6 text-red-700 dark:text-red-400", className)}
    />
  );
}

const control =
  "block w-full rounded-lg border border-zinc-950/15 bg-white px-3 py-2.5 text-base/6 text-zinc-950 shadow-sm outline-none placeholder:text-zinc-400 hover:border-zinc-950/30 focus:border-[#ef4835] focus:ring-2 focus:ring-[#ef4835]/20 disabled:bg-zinc-100 disabled:text-zinc-500 sm:py-2 sm:text-sm/6 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-white/30 dark:focus:border-[#ff6b57] dark:focus:ring-[#ef4835]/30 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400";

export const Input = forwardRef<HTMLInputElement, Headless.InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <Headless.Input
        ref={ref}
        {...props}
        className={clsx(control, className)}
      />
    );
  },
);
export const Select = forwardRef<HTMLSelectElement, Headless.SelectProps>(
  function Select({ className, ...props }, ref) {
    return (
      <Headless.Select
        ref={ref}
        {...props}
        className={clsx(control, "appearance-none pr-9", className)}
      />
    );
  },
);
