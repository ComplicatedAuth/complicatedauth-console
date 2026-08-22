import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";

const userEmail = "person@example.com";
const ownerPassword = "a correct owner password";
const userPassword = "a secure project password";
const backendURL = process.env.BACKEND_URL ?? "http://localhost:8080";
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
  await expect(page).toHaveURL(/\/setup-security\?/);
  await page.getByRole("button", { name: "Create passkey" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/new$/);

  await page.getByRole("link", { name: "OAuth applications" }).click();
  await page.getByRole("button", { name: "Register application" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Acceptance OAuth Client");
  await page
    .getByRole("dialog")
    .getByLabel("Application type")
    .selectOption("confidential");
  await page
    .getByRole("dialog")
    .getByLabel("Exact redirect URIs")
    .fill("http://localhost:4175/callback");
  const createdApplicationResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/v1/oauth/applications") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Register application" }).click();
  const createdApplication = (await (
    await createdApplicationResponse
  ).json()) as { client_id: string; uid: string };
  await expect(page).toHaveURL(
    new RegExp(`/app/oauth-applications/${createdApplication.uid}$`),
  );
  await expect(page.getByLabel("Client ID")).toHaveValue(
    createdApplication.client_id,
  );

  await page.getByRole("button", { name: "Create secret" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Acceptance test");
  const createdSecretResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(
        `/v1/oauth/applications/${createdApplication.uid}/client-secrets`,
      ) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create secret" }).click();
  const createdSecret = (await (await createdSecretResponse).json()) as {
    secret: string;
  };
  await expect(
    page.getByRole("dialog", { name: "Copy this client secret now" }),
  ).toContainText(createdSecret.secret);
  await page.getByRole("button", { name: "I have saved it" }).click();

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const state = randomUUID();
  const authorize = new URL("/oauth/authorize", backendURL);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: createdApplication.client_id,
    redirect_uri: "http://localhost:4175/callback",
    scope: "openid profile email",
    state,
    nonce: randomUUID(),
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  await page.route("http://localhost:4175/callback**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>OAuth callback</title>",
    }),
  );
  await page.goto(authorize.toString());
  await expect(
    page.getByRole("heading", { name: "Connect to Acceptance OAuth Client?" }),
  ).toBeVisible();
  await expect(page.getByText("openid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve access" }).click();
  await expect(page).toHaveURL(/localhost:4175\/callback\?/);
  const callback = new URL(page.url());
  expect(callback.searchParams.get("state")).toBe(state);
  const code = callback.searchParams.get("code");
  expect(code).toBeTruthy();

  const tokenResponse = await request.post(
    `${backendURL}/oauth/token`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${createdApplication.client_id}:${createdSecret.secret}`).toString("base64")}`,
      },
      form: {
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: "http://localhost:4175/callback",
        code_verifier: verifier,
      },
    },
  );
  expect(tokenResponse.status()).toBe(200);
  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    id_token: string;
    token_type: string;
  };
  expect(tokens.token_type).toBe("Bearer");
  expect(tokens.id_token.split(".")).toHaveLength(3);
  const userInfoResponse = await request.get(
    `${backendURL}/oauth/userinfo`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  expect(userInfoResponse.status()).toBe(200);
  const userInfo = (await userInfoResponse.json()) as {
    sub: string;
    email: string;
    name: string;
  };
  expect(userInfo.sub).toBeTruthy();
  expect(userInfo.email).toBe(ownerEmail);
  expect(userInfo.name).toBe("Alice Owner");

  await page.goto("/app/account");
  const primaryCredentialRow = page
    .getByRole("row")
    .filter({ hasText: "This device" });
  await expect(primaryCredentialRow).toContainText("Passkey");
  await cdp.send("WebAuthn.setAutomaticPresenceSimulation", {
    authenticatorId,
    enabled: false,
  });
  const { authenticatorId: backupAuthenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "usb",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  await page.getByLabel("New authenticator name").fill("Backup security key");
  const backupCeremonyResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(
        "/v1/console/webauthn-registration-ceremonies",
      ) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Add security key" }).click();
  const backupCeremony = (await (await backupCeremonyResponse).json()) as {
    public_key: { excludeCredentials?: unknown[] };
  };
  expect(backupCeremony.public_key.excludeCredentials).toHaveLength(1);
  const backupCredentialRow = page
    .getByRole("row")
    .filter({ hasText: "Backup security key" });
  await expect(backupCredentialRow).toBeVisible();
  await expect(backupCredentialRow).toContainText("Security key");
  await backupCredentialRow.getByRole("button", { name: "Rename" }).click();
  await page
    .getByRole("textbox", { name: "Authenticator name", exact: true })
    .fill("Travel security key");
  await page
    .getByRole("button", { name: "Save authenticator name" })
    .click();
  const travelCredentialRow = page
    .getByRole("row")
    .filter({ hasText: "Travel security key" });
  await expect(travelCredentialRow).toBeVisible();
  await travelCredentialRow.getByRole("button", { name: "Remove" }).click();
  await expect(travelCredentialRow).toHaveCount(0);
  await cdp.send("WebAuthn.removeVirtualAuthenticator", {
    authenticatorId: backupAuthenticatorId,
  });
  await cdp.send("WebAuthn.setAutomaticPresenceSimulation", {
    authenticatorId,
    enabled: true,
  });
  const consentRow = page
    .getByRole("row")
    .filter({ hasText: "Acceptance OAuth Client" });
  await expect(consentRow).toContainText("active");
  await consentRow.getByRole("button", { name: "Revoke" }).click();
  await expect(consentRow).toContainText("revoked");
  const revokedUserInfoResponse = await request.get(
    `${backendURL}/oauth/userinfo`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  expect(revokedUserInfoResponse.status()).toBe(401);

  await page.getByRole("link", { name: "Resource servers" }).click();
  await page
    .getByRole("button", { name: "Register resource server" })
    .click();
  await page.getByRole("dialog").getByLabel("Name").fill("Documents API");
  await page
    .getByRole("dialog")
    .getByLabel("Exact audience identifier")
    .fill("http://localhost:4176");
  const createdResourceServerResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/v1/resource-servers") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Register resource server" })
    .click();
  const createdResourceServer = (await (
    await createdResourceServerResponse
  ).json()) as { uid: string; identifier: string };
  await expect(page).toHaveURL(
    new RegExp(`/app/resource-servers/${createdResourceServer.uid}$`),
  );

  async function createDelegatedScope(
    name: string,
    displayName: string,
  ): Promise<{ uid: string; name: string }> {
    await page
      .getByRole("main")
      .getByRole("button", { name: "Create scope" })
      .click();
    await page.getByRole("dialog").getByLabel("Scope token").fill(name);
    await page
      .getByRole("dialog")
      .getByLabel("Consent label")
      .fill(displayName);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(
          `/v1/resource-servers/${createdResourceServer.uid}/scopes`,
        ) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Create scope" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const result = (await response.json()) as {
      uid: string;
      name: string;
    };
    await expect(
      page.getByRole("dialog", { name: "Create delegated scope" }),
    ).toHaveCount(0);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    return result;
  }
  const readScope = await createDelegatedScope(
    "documents.read",
    "Read documents",
  );
  await createDelegatedScope("documents.write", "Write documents");

  await page.goto(`/app/oauth-applications/${createdApplication.uid}`);
  await page.getByRole("button", { name: "Add grant" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Resource Server")
    .selectOption(createdResourceServer.uid);
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /documents\.read/ })
    .check();
  const createdGrantResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(
        `/v1/oauth/applications/${createdApplication.uid}/grants`,
      ) && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Add grant" }).click();
  await createdGrantResponse;
  await expect(page.getByText("documents.read", { exact: true })).toBeVisible();

  const delegatedVerifier = randomBytes(32).toString("base64url");
  const delegatedChallenge = createHash("sha256")
    .update(delegatedVerifier)
    .digest("base64url");
  const delegatedState = randomUUID();
  const delegatedAuthorize = new URL("/oauth/authorize", backendURL);
  delegatedAuthorize.search = new URLSearchParams({
    response_type: "code",
    client_id: createdApplication.client_id,
    redirect_uri: "http://localhost:4175/callback",
    resource: createdResourceServer.identifier,
    scope: `openid profile ${readScope.name}`,
    state: delegatedState,
    nonce: randomUUID(),
    code_challenge: delegatedChallenge,
    code_challenge_method: "S256",
  }).toString();
  await page.goto(delegatedAuthorize.toString());
  await expect(
    page.getByText(/requesting delegated access to Documents API/),
  ).toBeVisible();
  await expect(page.getByText("Read documents", { exact: true })).toBeVisible();
  await expect(page.getByText(createdResourceServer.identifier)).toBeVisible();
  await page.getByRole("button", { name: "Approve access" }).click();
  await expect(page).toHaveURL(/localhost:4175\/callback\?/);
  const delegatedCallback = new URL(page.url());
  expect(delegatedCallback.searchParams.get("state")).toBe(delegatedState);
  const delegatedCode = delegatedCallback.searchParams.get("code");
  expect(delegatedCode).toBeTruthy();
  const delegatedTokenResponse = await request.post(
    `${backendURL}/oauth/token`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${createdApplication.client_id}:${createdSecret.secret}`).toString("base64")}`,
      },
      form: {
        grant_type: "authorization_code",
        code: delegatedCode!,
        redirect_uri: "http://localhost:4175/callback",
        code_verifier: delegatedVerifier,
      },
    },
  );
  expect(delegatedTokenResponse.status()).toBe(200);
  const delegatedTokens = (await delegatedTokenResponse.json()) as {
    access_token: string;
  };
  const allowedDecisionResponse = await request.post(
    `${backendURL}/v1/authorization/decisions`,
    {
      headers: {
        Authorization: `Bearer ${delegatedTokens.access_token}`,
      },
      data: {
        resource: { type: "document", id: "doc_123" },
        operation: "documents.read",
      },
    },
  );
  expect(allowedDecisionResponse.status()).toBe(200);
  const allowedDecision = (await allowedDecisionResponse.json()) as {
    allowed: boolean;
    tenant_uid: string;
    resource_server_uid: string;
    denial_reason: string | null;
  };
  expect(allowedDecision).toMatchObject({
    allowed: true,
    resource_server_uid: createdResourceServer.uid,
    denial_reason: null,
  });
  const deniedDecisionResponse = await request.post(
    `${backendURL}/v1/authorization/decisions`,
    {
      headers: {
        Authorization: `Bearer ${delegatedTokens.access_token}`,
      },
      data: {
        resource: { type: "document", id: "doc_123" },
        operation: "documents.write",
      },
    },
  );
  expect(await deniedDecisionResponse.json()).toMatchObject({
    allowed: false,
    denial_reason: "missing_capability",
  });

  await page.goto("/app/account");
  const delegatedConsentRow = page
    .getByRole("row")
    .filter({ hasText: "Documents API" });
  await expect(delegatedConsentRow).toContainText("documents.read");
  await delegatedConsentRow.getByRole("button", { name: "Revoke" }).click();
  await expect(delegatedConsentRow).toContainText("revoked");
  const revokedDecisionResponse = await request.post(
    `${backendURL}/v1/authorization/decisions`,
    {
      headers: {
        Authorization: `Bearer ${delegatedTokens.access_token}`,
      },
      data: {
        resource: { type: "document", id: "doc_123" },
        operation: "documents.read",
      },
    },
  );
  expect(revokedDecisionResponse.status()).toBe(401);

  const invitedEmail = `viewer-${randomUUID()}@example.com`;
  await page.getByRole("link", { name: "Tenant members" }).click();
  await page.getByRole("button", { name: "Invite member" }).click();
  await page.getByRole("dialog").getByLabel("Email address").fill(invitedEmail);
  await page.getByRole("dialog").getByLabel("Role").selectOption("viewer");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("The acceptance link was emailed to the new member.")).toBeVisible();
  await expect(page.getByText(invitedEmail)).toBeVisible();
  await page.getByRole("link", { name: "Create project" }).click();

  await page.getByLabel("Project name").fill("Acceptance App");
  await page.getByLabel("RP ID").fill("customer.localhost");
  await page.getByLabel("RP name").fill("Acceptance App");
  await page.getByLabel("Initial Origin").fill("http://customer.localhost:4174");
  await page.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+$/);
  const projectUID = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("link", { name: "Service accounts", exact: true }).click();
  await page.getByLabel("Workload name").fill("Acceptance RP");
  const createdAccountResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/v1/projects/${projectUID}/service-accounts`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create service account" }).click();
  const createdAccount = (await (await createdAccountResponse).json()) as {
    uid: string;
  };
  await page.getByRole("button", { name: "Issue credential" }).click();
  await page.getByLabel("Deployment label").fill("Acceptance credential");
  const createdCredentialResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(
        `/v1/projects/${projectUID}/service-accounts/${createdAccount.uid}/credentials`,
      ) && response.request().method() === "POST",
  );
  await page.getByRole("dialog").getByRole("button", { name: "Issue credential" }).click();
  const createdCredential = (await (await createdCredentialResponse).json()) as {
    uid: string;
    secret: string;
  };
  const serviceCredential = createdCredential.secret;
  await expect(page.locator(".secret-value code")).toHaveText(serviceCredential);
  expect(serviceCredential).toMatch(/^ca_sk_test_/);
  await page.getByRole("button", { name: "I have saved the credential" }).click();
  await expect(
    page.getByRole("dialog", { name: "Copy this service credential now" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Users" }).click();
  await page.getByLabel("Email address").fill(userEmail);
  await page.getByLabel(/Initial password/).fill(userPassword);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText(userEmail).first()).toBeVisible();
  const firstUserUID = await page.getByTestId("user-uid").first().textContent();

  await page.getByRole("link", { name: "Support cases" }).click();
  await page.getByRole("button", { name: "Create case" }).click();
  const supportDialog = page.getByRole("dialog");
  await supportDialog.getByLabel("Project").selectOption(projectUID);
  await supportDialog.getByLabel("Category").selectOption("bug");
  await supportDialog.getByLabel("Priority").selectOption("high");
  await supportDialog.getByLabel("Subject").fill("Acceptance login issue");
  await supportDialog
    .getByLabel("Initial message")
    .fill("The customer returned to the login page unexpectedly.");
  await supportDialog.getByRole("button", { name: "Create case" }).click();
  const supportRow = page
    .getByRole("row")
    .filter({ hasText: "Acceptance login issue" });
  await expect(supportRow).toContainText("high");
  await supportRow.getByRole("link", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Acceptance login issue" })).toBeVisible();
  await page.getByLabel("Status").selectOption("in_progress");
  await page.getByLabel("Assignee").selectOption({ label: "Alice Owner" });
  await page.getByRole("button", { name: "Save triage" }).click();
  await expect(page.getByText("in_progress", { exact: true })).toBeVisible();
  await page.getByLabel("Reply or note").fill("Check the redirect state before replying.");
  await page.getByLabel("Visibility").selectOption("internal");
  await page.getByRole("button", { name: "Add message" }).click();
  await expect(page.getByText("Check the redirect state before replying.")).toBeVisible();
  await page.getByLabel("Upload file").setInputFiles({
    name: "acceptance.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("acceptance support attachment\n"),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("acceptance.txt")).toBeVisible();
  await page.getByLabel("Provider").fill("example_tracker");
  await page.getByLabel("External ID").fill("BUG-42");
  await page.getByLabel("Safe URL").fill("https://tracker.example/cases/BUG-42");
  await page.getByLabel("Label").fill("Engineering issue");
  await page.getByRole("button", { name: "Link record" }).click();
  await expect(page.getByText("Engineering issue")).toBeVisible();
  await expect(page.getByText("support_case.attachment_created")).toBeVisible();

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
        SERVICE_CREDENTIAL: serviceCredential!,
        BACKEND_URL: backendURL,
        RP_PORT: "4174",
      },
      stdio: "pipe",
    },
  );
  await expect
    .poll(async () =>
      (
        await request.get("http://customer.localhost:4174/health").catch(() => null)
      )?.status(),
    )
    .toBe(200);

  await page.goto("http://customer.localhost:4174");
  await page.getByRole("button", { name: "Password login" }).click();
  await expect(page.getByTestId("status")).toHaveText(
    "Password factor verified",
  );
  await page.getByRole("button", { name: "Register passkey" }).click();
  await expect(page.getByTestId("status")).toHaveText("Passkey registered");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByTestId("status")).toHaveText("Logged out");
  await page.getByRole("button", { name: "Passkey login" }).click();
  await expect(page.getByTestId("status")).toHaveText("Password + passkey session active");
  const rpSession = await page.request.get("http://customer.localhost:4174/session");
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
  await page
    .getByLabel("Add an Origin")
    .fill("http://customer.localhost:4180");
  await page.getByRole("button", { name: "Add Origin" }).click();
  await expect(page.getByText("http://customer.localhost:4180")).toBeVisible();
  await page
    .getByRole("button", { name: "Remove http://customer.localhost:4180" })
    .click();
  await page.getByRole("button", { name: "Remove Origin" }).click();
  await expect(
    page.getByText("http://customer.localhost:4180", { exact: true }),
  ).toBeHidden();

  await page.getByRole("link", { name: "Service accounts", exact: true }).click();
  await page.getByRole("button", { name: "Issue credential" }).click();
  await page.getByLabel("Deployment label").fill("Replacement credential");
  await page.getByRole("dialog").getByRole("button", { name: "Issue credential" }).click();
  await expect(page.getByText("Copy this service credential now")).toBeVisible();
  await page.getByRole("button", { name: "I have saved the credential" }).click();
  await expect(
    page.getByRole("dialog", { name: "Copy this service credential now" }),
  ).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "Acceptance credential" })
    .getByRole("button", { name: "Revoke" })
    .click();
  await page.getByRole("button", { name: "Revoke credential" }).click();
  await expect(page.getByText("revoked").first()).toBeVisible();

  await page.evaluate(async () => {
    const response = await fetch("/api/v1/console/auth/logout", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Console logout failed");
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByLabel("Password", { exact: true }).fill(ownerPassword);
  await page.getByRole("button", { name: "Continue with passkey" }).click();
  await expect(page).toHaveURL(/\/app\/projects$/);

  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
