import clsx from "clsx";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[28%] bg-[#ef4835] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute h-[62%] w-[28%] -rotate-45 rounded-full bg-white" />
      <span className="absolute h-[28%] w-[62%] -rotate-45 rounded-full bg-white" />
      <span className="absolute size-[21%] rounded-full bg-[#0e1129]" />
    </span>
  );
}

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <BrandMark className="size-8" />
      {!compact && (
        <span className="text-base font-bold tracking-[-0.025em]">
          ComplicatedAuth
        </span>
      )}
    </span>
  );
}
