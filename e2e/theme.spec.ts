import { expect, test, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";

type Rgb = [number, number, number];

function luminance(color: Rgb) {
  const [red, green, blue] = color.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: Rgb, background: Rgb) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectReadable(locator: Locator, minimum = 4.5) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas color resolver unavailable");
    const resolve = (value: string): Rgb => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(
        context.getImageData(0, 0, 1, 1).data.slice(0, 3),
      ) as Rgb;
    };
    return {
      foreground: resolve(style.color),
      background: resolve(style.backgroundColor),
    };
  });
  expect(
    contrast(colors.foreground, colors.background),
    `${colors.foreground.join(", ")} on ${colors.background.join(", ")}`,
  ).toBeGreaterThanOrEqual(minimum);
}

async function expectFormControlsReadable(scope: Locator) {
  for (const control of await scope.locator("input, select, textarea").all()) {
    await expectReadable(control);
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`${colorScheme} mode keeps authentication and onboarding forms readable`, async ({
    page,
    context,
  }) => {
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
    await page.emulateMedia({ colorScheme });
    await page.goto("/signup");

    await expectReadable(page.locator("main"));
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(page.getByRole("button", { name: "Create account" }));

    await page.getByLabel("Display name").fill("Theme Owner");
    await page.getByLabel("Tenant name").fill(`Theme ${colorScheme}`);
    await page
      .getByLabel("Email address")
      .fill(`theme-${colorScheme}-${randomUUID()}@example.com`);
    await page
      .getByLabel("Password", { exact: true })
      .fill("a readable theme password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/setup-security\?/);
    await expectReadable(page.locator("main"));
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(page.getByRole("button", { name: "Create passkey" }));
    await page.getByRole("button", { name: "Create passkey" }).click();
    await expect(page).toHaveURL(/\/app\/projects\/new$/);

    await expectReadable(page.locator("body"));
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(page.getByRole("button", { name: "Create Project" }));

    await page.getByLabel("Project name").fill(`Theme ${colorScheme} Project`);
    await page.getByLabel("RP name").fill(`Theme ${colorScheme}`);
    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+$/);

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(page.getByRole("button", { name: "Save changes" }));
    await expectReadable(page.getByRole("button", { name: "Add Origin" }));

    await page.getByRole("link", { name: "Service accounts", exact: true }).click();
    await expect(page).toHaveURL(/\/service-accounts$/);
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(
      page.getByRole("button", { name: "Create service account" }),
    );

    await page.getByRole("link", { name: "Users", exact: true }).click();
    await expect(page).toHaveURL(/\/users$/);
    await expectFormControlsReadable(page.locator("main"));
    await expectReadable(page.getByRole("button", { name: "Create user" }));

    await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });
}
