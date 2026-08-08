"use client";

import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect } from "react";

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);
  return (
    <div className="toast-in fixed right-5 bottom-5 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-[#0e1129] px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
      <CheckCircleIcon className="size-5 shrink-0 text-emerald-400" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="text-white/40 hover:text-white"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}
