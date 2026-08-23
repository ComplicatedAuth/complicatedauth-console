"use client";

import { mountWidget } from "@dokosoko/widget";
import { useEffect } from "react";

export type DokoSokoWidgetConfig = {
  widgetId: string;
  host: string;
};

export function DokoSokoWidgetLauncher({ widgetId, host }: DokoSokoWidgetConfig) {
  useEffect(() => {
    const widget = mountWidget({
      widgetId,
      host,
      label: "Ask DokoSoko",
      getToken: async () => {
        const response = await fetch("/api/dokosoko/widget-token", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) {
          throw new Error("The assistant is temporarily unavailable.");
        }
        return response.json() as Promise<{
          bootstrapToken: string;
          expiresAt: string;
        }>;
      },
    });
    return () => widget.destroy();
  }, [host, widgetId]);

  return null;
}
