"use client";

import clsx from "clsx";
import Link from "next/link";

const colors = {
  coral:
    "border-[#c93324] bg-[#ef4835] text-[#0e1129] hover:bg-[#ff6b57] [--button-icon:#0e1129]",
  navy: "border-[#070916] bg-[#0e1129] text-white hover:bg-[#191d3d] [--button-icon:#a1a1aa]",
  red: "border-red-800 bg-red-700 text-white hover:bg-red-800 [--button-icon:#fecaca]",
  green:
    "border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800 [--button-icon:#d1fae5]",
} as const;

type StyleProps = {
  className?: string;
  children: React.ReactNode;
  color?: keyof typeof colors;
  outline?: boolean;
  plain?: boolean;
};
type Props = StyleProps &
  (
    | ({ href: string } & Omit<
        React.ComponentPropsWithoutRef<typeof Link>,
        "className" | "children" | "href"
      >)
    | ({ href?: never } & Omit<
        React.ComponentPropsWithoutRef<"button">,
        "className" | "children"
      >)
  );

export function Button({
  className,
  children,
  color,
  outline,
  plain,
  ...props
}: Props) {
  const classes = clsx(
    "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4835] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[var(--button-icon,currentColor)]",
    outline &&
      "border-zinc-950/10 bg-white text-zinc-950 hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
    plain &&
      "border-transparent bg-transparent text-zinc-700 shadow-none hover:bg-zinc-950/5 dark:text-zinc-200 dark:hover:bg-white/10",
    !outline && !plain && colors[color ?? "navy"],
    className,
  );
  if ("href" in props && typeof props.href === "string") {
    return (
      <Link {...props} href={props.href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={props.type ?? "button"} {...props} className={classes}>
      {children}
    </button>
  );
}
