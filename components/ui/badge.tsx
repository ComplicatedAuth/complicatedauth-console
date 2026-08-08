import clsx from "clsx";

const styles = {
  zinc: "bg-zinc-600/10 text-zinc-700 dark:bg-white/10 dark:text-zinc-300",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-400/20 text-amber-800 dark:text-amber-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-400",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
} as const;

export function Badge({
  color = "zinc",
  className,
  ...props
}: { color?: keyof typeof styles } & React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs/5 font-medium capitalize",
        styles[color],
        className,
      )}
    />
  );
}
