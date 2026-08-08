import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

const userEmail = "person@example.com";
const ownerPassword = "a correct owner password";
const userPassword = "a secure project password";
let rp: ChildProcess | undefined;

test.afterEach(() => rp?.kill("SIGTERM"));

test("complete console and RP password/passkey flow", async ({
  page,
  request,
  context,
}) => {
  const ownerEmail = `owner-${randomUUID()}@example.com`;
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );

  await page.goto("/signup");
  await page.getByLabel("Display name").fill("Alice Owner");
  await page.getByLabel("Tenant name").fill("Acceptance Tenant");
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByLabel("Password", { exact: true }).fill(ownerPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/new$/);

  await page.getByLabel("Project name").fill("Acceptance App");
  await page.getByLabel("RP name").fill("Acceptance App");
  await page.getByLabel("Initial Origin").fill("http://localhost:4174");
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+$/);
  const projectUID = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("link", { name: "API Keys", exact: true }).click();
  await page.getByLabel("Key name").fill("Acceptance RP");
  const createdKeyResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/v1/projects/${projectUID}/api-keys`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create key" }).click();
  const createdKey = (await (await createdKeyResponse).json()) as {
    secret: string;
  };
  const apiKey = createdKey.secret;
  await expect(page.locator(".secret-value code")).toHaveText(apiKey);
  expect(apiKey).toMatch(/^ca_pk_/);
  await page.getByRole("button", { name: "I have saved the key" }).click();

  await page.getByRole("link", { name: "Users" }).click();
  await page.getByLabel("Email address").fill(userEmail);
  await page.getByLabel(/Initial password/).fill(userPassword);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText(userEmail).first()).toBeVisible();
  const firstUserUID = await page.getByTestId("user-uid").first().textContent();

  const secondUserUID = await page.evaluate(async () => {
    const headers = { "Content-Type": "application/json" };
    const project = await fetch("/api/v1/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Second App",
        environment: "sandbox",
        rp_id: "localhost",
        rp_name: "Second",
        initial_origin: "http://localhost:4180",
      }),
    }).then((response) => response.json());
    const user = await fetch(`/api/v1/projects/${project.uid}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: "person@example.com" }),
    }).then((response) => response.json());
    return user.uid as string;
  });
  expect(secondUserUID).not.toBe(firstUserUID);

  rp = spawn(
    process.execPath,
    [path.join(process.cwd(), "e2e/rp-server.mjs")],
    {
      env: {
        ...process.env,
        PROJECT_UID: projectUID,
        PROJECT_API_KEY: apiKey!,
        BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:8080",
        RP_PORT: "4174",
      },
      stdio: "pipe",
    },
  );
  await expect
    .poll(async () =>
      (
        await request.get("http://localhost:4174/health").catch(() => null)
      )?.status(),
    )
    .toBe(200);

  await page.goto("http://localhost:4174");
  await page.getByRole("button", { name: "Password login" }).click();
  await expect(page.getByTestId("status")).toHaveText(
    "Password session active",
  );
  await page.getByRole("button", { name: "Register passkey" }).click();
  await expect(page.getByTestId("status")).toHaveText("Passkey registered");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByTestId("status")).toHaveText("Logged out");
  await page.getByRole("button", { name: "Passkey login" }).click();
  await expect(page.getByTestId("status")).toHaveText("Passkey session active");
  const rpSession = await page.request.get("http://localhost:4174/session");
  expect((await rpSession.json()).session_reference).toBeUndefined();

  await page.goto(`/app/projects/${projectUID}/settings`);
  await expect(page.getByLabel("RP ID")).toBeDisabled();
  await expect(page.getByText("RP ID is permanently locked")).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: "" });

  await page.goto(`/app/projects/${projectUID}/origins`);
  await expect(page).toHaveURL(
    new RegExp(`/app/projects/${projectUID}/settings#origins$`),
  );
  await page.getByLabel("Add an Origin").fill("http://localhost:4180");
  await page.getByRole("button", { name: "Add Origin" }).click();
  await expect(page.getByText("http://localhost:4180")).toBeVisible();
  await page
    .getByRole("button", { name: "Remove http://localhost:4180" })
    .click();
  await page.getByRole("button", { name: "Remove Origin" }).click();
  await expect(
    page.getByText("http://localhost:4180", { exact: true }),
  ).toBeHidden();

  await page.getByRole("link", { name: "API Keys", exact: true }).click();
  await page.getByTitle("Rotate").click();
  await page.getByRole("button", { name: "Rotate key" }).click();
  await expect(page.getByText("Copy this API key now")).toBeVisible();
  await page.getByRole("button", { name: "I have saved the key" }).click();
  await page.getByTitle("Revoke").click();
  await page.getByRole("button", { name: "Revoke key" }).click();
  await expect(page.getByText("revoked").first()).toBeVisible();

  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
