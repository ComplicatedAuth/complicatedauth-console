"use client";

import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { Button } from "./button";

const sizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
} as const;

export function Dialog({
  size = "lg",
  className,
  children,
  ...props
}: {
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
} & Omit<Headless.DialogProps, "as" | "className">) {
  return (
    <Headless.Dialog {...props} className="relative z-50">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-[#0e1129]/45 backdrop-blur-[2px] transition data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex min-h-full items-center justify-center">
          <Headless.DialogPanel
            transition
            className={clsx(
              "w-full rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-950/10 transition data-closed:translate-y-4 data-closed:scale-95 data-closed:opacity-0 dark:bg-zinc-900 dark:ring-white/10 sm:p-8",
              sizes[size],
              className,
            )}
          >
            {children}
          </Headless.DialogPanel>
        </div>
      </div>
    </Headless.Dialog>
  );
}
export function DialogTitle({
  className,
  ...props
}: Omit<Headless.DialogTitleProps, "as" | "className"> & {
  className?: string;
}) {
  return (
    <Headless.DialogTitle
      {...props}
      className={clsx(
        "text-lg/6 font-semibold text-zinc-950 dark:text-white",
        className,
      )}
    />
  );
}
export function DialogDescription({
  className,
  ...props
}: Omit<Headless.DescriptionProps, "as" | "className"> & {
  className?: string;
}) {
  return (
    <Headless.Description
      {...props}
      className={clsx(
        "mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400",
        className,
      )}
    />
  );
}
export function DialogBody({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={clsx("mt-6", className)} />;
}
export function DialogActions({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "mt-8 flex flex-col-reverse justify-end gap-3 sm:flex-row",
        className,
      )}
    />
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = true,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <DialogActions>
        <Button plain onClick={onClose}>
          Cancel
        </Button>
        <Button color={danger ? "red" : "coral"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
