const requestHeaderDenylist = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
]);

const responseHeaderDenylist = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function apiOrigin(): URL {
  const configured = process.env.INTERNAL_API_URL ?? "http://localhost:8080";
  const origin = new URL(configured);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("INTERNAL_API_URL must be an HTTP(S) URL without credentials, query, or fragment");
  }
  return origin;
}

function timeoutMilliseconds(): number {
  const configured = Number(process.env.INTERNAL_API_TIMEOUT_MS ?? "30000");
  return Number.isSafeInteger(configured) && configured >= 100 && configured <= 120_000
    ? configured
    : 30_000;
}

function upstreamURL(request: Request): URL {
  const incoming = new URL(request.url);
  const upstream = apiOrigin();
  const basePath = upstream.pathname.replace(/\/$/, "");
  const apiPath = incoming.pathname.slice("/api".length);
  upstream.pathname = `${basePath}${apiPath}`;
  upstream.search = incoming.search;
  return upstream;
}

function requestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!requestHeaderDenylist.has(name.toLowerCase())) headers.append(name, value);
  }
  // Avoid returning a decompressed body with stale Content-Encoding metadata.
  headers.set("accept-encoding", "identity");
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const [name, value] of upstream.headers) {
    if (!responseHeaderDenylist.has(name.toLowerCase())) headers.append(name, value);
  }
  return headers;
}

async function proxy(request: Request): Promise<Response> {
  const supportsBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: requestHeaders(request),
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.any([
      request.signal,
      AbortSignal.timeout(timeoutMilliseconds()),
    ]),
  };
  if (supportsBody) {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(upstreamURL(request), init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return Response.json(
      {
        error: {
          code: timedOut ? "upstream_timeout" : "upstream_unavailable",
          message: timedOut
            ? "The API did not respond in time."
            : "The API is temporarily unavailable.",
        },
      },
      {
        status: timedOut ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export const dynamic = "force-dynamic";

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
