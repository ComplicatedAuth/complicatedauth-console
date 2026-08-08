import clsx from "clsx";

export function Heading({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      {...props}
      className={clsx(
        "text-3xl/9 font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white",
        className,
      )}
    />
  );
}
export function Subheading({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      {...props}
      className={clsx(
        "text-sm/6 font-semibold text-zinc-950 dark:text-white",
        className,
      )}
    />
  );
}
export function Text({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      {...props}
      className={clsx("text-sm/6 text-zinc-500 dark:text-zinc-400", className)}
    />
  );
}
export function Mono({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"code">) {
  return <code {...props} className={clsx("font-mono text-xs/5", className)} />;
}
