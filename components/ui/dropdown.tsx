"use client";

import * as Headless from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";

export const Dropdown = Headless.Menu;
export function DropdownButton({
  className,
  ...props
}: Headless.MenuButtonProps) {
  return (
    <Headless.MenuButton
      {...props}
      className={clsx("outline-none", className)}
    />
  );
}
export function DropdownMenu({
  className,
  anchor = "bottom end",
  ...props
}: Headless.MenuItemsProps & {
  anchor?: "bottom end" | "bottom start" | "top start";
}) {
  return (
    <Headless.MenuItems
      transition
      anchor={anchor}
      {...props}
      className={clsx(
        "z-50 min-w-56 origin-top rounded-xl bg-white p-1.5 text-sm shadow-xl ring-1 ring-zinc-950/10 transition focus:outline-none data-closed:scale-95 data-closed:opacity-0 dark:bg-zinc-800 dark:ring-white/10",
        className,
      )}
    />
  );
}
export function DropdownItem({
  className,
  href,
  ...props
}: Headless.MenuItemProps<"button"> & { href?: string }) {
  const classes = clsx(
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 data-focus:bg-zinc-100 data-focus:text-zinc-950 dark:text-zinc-200 dark:data-focus:bg-white/10 dark:data-focus:text-white [&_svg]:size-4",
    className,
  );
  if (href)
    return (
      <Headless.MenuItem
        as={Link}
        href={href}
        {...(props as object)}
        className={classes}
      />
    );
  return (
    <Headless.MenuItem
      as="button"
      type="button"
      {...props}
      className={classes}
    />
  );
}
export function DropdownDivider() {
  return <div className="my-1 h-px bg-zinc-950/10 dark:bg-white/10" />;
}
