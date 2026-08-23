import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/dokosoko/widget-token/route.ts";

const consoleOrigin = "http://console.complicatedauth.localhost:33000";
const session = {
  tenant: { uid: "8d278698-fab3-4e1b-95f5-041f5190c8a5", name: "Acceptance", slug: "acceptance" },
  member: {
    uid: "87754abf-6a93-48b9-b256-c9b5c75c849b",
    email: "owner@example.test",
    display_name: "Owner",
    role: "owner",
    status: "active",
    email_verified: true,
    created_at: "2026-08-24T00:00:00Z",
  },
  authentication_assurance: "strong",
  expires_at: "2026-08-25T00:00:00Z",
};

function widgetRequest(origin = consoleOrigin) {
  return new Request(`${consoleOrigin}/api/dokosoko/widget-token`, {
    method: "POST",
    headers: { origin, cookie: "complicatedauth_session=opaque" },
    body: JSON.stringify({ userId: "browser-forgery", organizationId: "browser-forgery" }),
  });
}

test("widget bootstrap route enforces origin, session, and server-derived identity", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    CONSOLE_PUBLIC_ORIGIN: process.env.CONSOLE_PUBLIC_ORIGIN,
    DOKOSOKO_API_URL: process.env.DOKOSOKO_API_URL,
    DOKOSOKO_WIDGET_ID: process.env.DOKOSOKO_WIDGET_ID,
    DOKOSOKO_WIDGET_SECRET: process.env.DOKOSOKO_WIDGET_SECRET,
  };
  process.env.INTERNAL_API_URL = "http://backend.test";
  process.env.CONSOLE_PUBLIC_ORIGIN = consoleOrigin;
  process.env.DOKOSOKO_API_URL = "http://api.dokosoko.localhost:8080";
  process.env.DOKOSOKO_WIDGET_ID = "0a4ff131-7f2c-46d9-a43c-356e21092f7d";
  process.env.DOKOSOKO_WIDGET_SECRET = "doko_wsk_test-only-not-a-real-secret";

  let authenticated = true;
  const upstreamRequests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === "http://backend.test/v1/console/auth/session") {
      assert.equal(new Headers(init.headers).get("cookie"), "complicatedauth_session=opaque");
      return authenticated
        ? Response.json(session)
        : Response.json({ error: { code: "unauthenticated" } }, { status: 401 });
    }
    if (url === "http://api.dokosoko.localhost:8080/v1/widget-sessions") {
      upstreamRequests.push({ headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
      return Response.json(
        { bootstrapToken: "doko_wbt_test-bootstrap", expiresAt: "2026-08-24T00:01:00Z" },
        { status: 201 },
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    await t.test("rejects a forged browser origin before contacting either backend", async () => {
      const response = await POST(widgetRequest("http://attacker.localhost:33000"));
      assert.equal(response.status, 403);
      assert.equal(upstreamRequests.length, 0);
    });

    await t.test("requires the live strong ComplicatedAuth console session", async () => {
      authenticated = false;
      const response = await POST(widgetRequest());
      assert.equal(response.status, 401);
      assert.equal(upstreamRequests.length, 0);
      authenticated = true;
    });

    await t.test("ignores browser identity input and keeps the widget secret server-only", async () => {
      const response = await POST(widgetRequest());
      assert.equal(response.status, 201);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), {
        bootstrapToken: "doko_wbt_test-bootstrap",
        expiresAt: "2026-08-24T00:01:00Z",
      });
      assert.equal(upstreamRequests.length, 1);
      assert.deepEqual(upstreamRequests[0].body, {
        widgetId: process.env.DOKOSOKO_WIDGET_ID,
        userId: session.member.uid,
        organizationId: session.tenant.uid,
        origin: consoleOrigin,
      });
      assert.equal(
        upstreamRequests[0].headers.get("authorization"),
        `Bearer ${process.env.DOKOSOKO_WIDGET_SECRET}`,
      );
      assert.equal(JSON.stringify(upstreamRequests[0].body).includes("doko_wsk_"), false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
