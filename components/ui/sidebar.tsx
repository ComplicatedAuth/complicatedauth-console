import clsx from "clsx";
import Link from "next/link";

export function Sidebar({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      {...props}
      className={clsx("flex h-full min-h-0 flex-col", className)}
    />
  );
}
export function SidebarHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("border-b border-white/5 p-4", className)}
    />
  );
}
export function SidebarBody({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("flex flex-1 flex-col overflow-y-auto p-4", className)}
    />
  );
}
export function SidebarFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("border-t border-white/5 p-4", className)}
    />
  );
}
export function SidebarSection({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("flex flex-col gap-0.5 [&+&]:mt-7", className)}
    />
  );
}
export function SidebarHeading({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      {...props}
      className={clsx(
        "mb-1 px-2 text-xs/6 font-medium text-zinc-400",
        className,
      )}
    />
  );
}
export function SidebarSpacer() {
  return <div className="mt-8 flex-1" />;
}
export function SidebarItem({
  current,
  className,
  children,
  ...props
}: {
  current?: boolean;
  className?: string;
  children: React.ReactNode;
  href: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "className">) {
  return (
    <Link
      {...props}
      className={clsx(
        "relative flex min-h-10 w-full items-center gap-3 rounded-lg px-2 py-2 text-sm/5 font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-zinc-400",
        current &&
          "bg-white/[0.07] text-white before:absolute before:inset-y-2 before:-left-4 before:w-0.5 before:rounded-full before:bg-[#ef4835] [&_svg]:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}
