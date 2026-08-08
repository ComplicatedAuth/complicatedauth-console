import clsx from "clsx";
import { Badge } from "./ui/badge";
import { Heading, Subheading, Text } from "./ui/typography";

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "mb-2 text-xs font-bold tracking-[0.11em] text-[#c93324] uppercase dark:text-[#ff8879]",
        className,
      )}
    >
      {children}
    </p>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading>{title}</Heading>
        {description && (
          <Text className="mt-2 max-w-2xl text-base/7">{description}</Text>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
          <div>
            {title && <Subheading>{title}</Subheading>}
            {description && <Text className="mt-1">{description}</Text>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function EnvironmentBadge({ value }: { value: string }) {
  return (
    <Badge color={value === "production" ? "zinc" : "amber"}>{value}</Badge>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      color={
        value === "active" || value === "verified"
          ? "green"
          : value === "revoked"
            ? "red"
            : value === "unverified"
              ? "amber"
              : "zinc"
      }
    >
      {value}
    </Badge>
  );
}
export function MetricCard({
  icon,
  value,
  label,
  note,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fdecea] text-[#d93d2c] dark:bg-[#3b171a] dark:text-[#ff8879] [&_svg]:size-5">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-[-0.04em] text-zinc-950 dark:text-white">
          {value}
        </div>
        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {note && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{note}</div>
        )}
      </div>
    </div>
  );
}
