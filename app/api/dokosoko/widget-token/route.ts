import DokoSokoWidgetBackend, {
  DokoSokoWidgetError,
} from "@dokosoko/widget-backend";
import type { Session } from "@/lib/api";

export const dynamic = "force-dynamic";

type WidgetEnvironment = {
  apiURL: string;
  consoleOrigin: string;
  widgetId: string;
  widgetSecret: string;
};

function credentialFreeOrigin(raw: string, name: string): string {
  const value = new URL(raw);
  const local =
    ["localhost", "127.0.0.1", "::1"].includes(value.hostname) ||
    value.hostname.endsWith(".localhost");
  if (
    (value.protocol !== "https:" && !(value.protocol === "http:" && local)) ||
    value.username ||
    value.password ||
    value.search ||
    value.hash ||
    (value.pathname && value.pathname !== "/")
  ) {
    throw new Error(`${name} must be a credential-free HTTPS origin; *.localhost HTTP is accepted for development.`);
  }
  return value.origin;
}

function widgetEnvironment(): WidgetEnvironment {
  const widgetId = process.env.DOKOSOKO_WIDGET_ID?.trim();
  const widgetSecret = process.env.DOKOSOKO_WIDGET_SECRET?.trim();
  if (!widgetId || !widgetSecret) {
    throw new Error("DokoSoko widget credentials are not configured.");
  }
  return {
    widgetId,
    widgetSecret,
    apiURL: credentialFreeOrigin(
      process.env.DOKOSOKO_API_URL ?? "https://api.dokosoko.com",
      "DOKOSOKO_API_URL",
    ),
    consoleOrigin: credentialFreeOrigin(
      process.env.CONSOLE_PUBLIC_ORIGIN ?? "",
      "CONSOLE_PUBLIC_ORIGIN",
    ),
  };
}

async function authenticatedSession(request: Request): Promise<Session | null> {
  const internalAPI = new URL(
    process.env.INTERNAL_API_URL ?? "http://localhost:8080",
  );
  internalAPI.pathname = `${internalAPI.pathname.replace(/\/$/, "")}/v1/console/auth/session`;
  const response = await fetch(internalAPI, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.json() as Promise<Session>;
}

export async function POST(request: Request): Promise<Response> {
  let environment: WidgetEnvironment;
  try {
    environment = widgetEnvironment();
  } catch {
    return Response.json(
      { error: { code: "widget_unavailable", message: "The assistant is not configured." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    new URL(request.url).origin !== environment.consoleOrigin ||
    request.headers.get("origin") !== environment.consoleOrigin
  ) {
    return Response.json(
      { error: { code: "origin_forbidden", message: "The request origin is not allowed." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const session = await authenticatedSession(request);
  if (!session || session.authentication_assurance !== "strong") {
    return Response.json(
      { error: { code: "unauthenticated", message: "Authentication is required." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const dokosoko = new DokoSokoWidgetBackend({
      widgetSecret: environment.widgetSecret,
      baseURL: environment.apiURL,
    });
    const bootstrap = await dokosoko.widgetSessions.create(
      {
        widgetId: environment.widgetId,
        userId: session.member.uid,
        organizationId: session.tenant.uid,
        origin: environment.consoleOrigin,
      },
      { idempotencyKey: crypto.randomUUID() },
    );
    return Response.json(bootstrap, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const requestId =
      error instanceof DokoSokoWidgetError ? error.requestId : undefined;
    return Response.json(
      {
        error: {
          code: "widget_unavailable",
          message: "The assistant is temporarily unavailable.",
          ...(requestId ? { request_id: requestId } : {}),
        },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
