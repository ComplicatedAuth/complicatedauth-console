import clsx from "clsx";

export function Table({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={clsx("overflow-x-auto", className)}>
      <table className="min-w-full text-left text-sm/6 text-zinc-950 dark:text-white">
        {children}
      </table>
    </div>
  );
}
export function TableHead(props: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      {...props}
      className={clsx(
        "text-xs text-zinc-500 dark:text-zinc-400",
        props.className,
      )}
    />
  );
}
export function TableBody(props: React.ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props} />;
}
export function TableRow(props: React.ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      {...props}
      className={clsx(
        "border-b border-zinc-950/5 last:border-0 hover:bg-zinc-950/[0.02] dark:border-white/5 dark:hover:bg-white/[0.025]",
        props.className,
      )}
    />
  );
}
export function TableHeader(props: React.ComponentPropsWithoutRef<"th">) {
  return (
    <th
      {...props}
      className={clsx(
        "border-b border-zinc-950/10 px-4 py-2.5 font-medium whitespace-nowrap dark:border-white/10",
        props.className,
      )}
    />
  );
}
export function TableCell(props: React.ComponentPropsWithoutRef<"td">) {
  return (
    <td
      {...props}
      className={clsx("px-4 py-4 align-middle", props.className)}
    />
  );
}
