export const PASSKEY_AUTHENTICATOR_AAGUIDS_URL =
  "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/aaguid.json";

export type PasskeyAuthenticatorMetadata = {
  name: string;
  icon_dark?: string;
  icon_light?: string;
};

export type PasskeyAuthenticatorCatalog = Record<
  string,
  PasskeyAuthenticatorMetadata
>;

let catalogPromise: Promise<PasskeyAuthenticatorCatalog> | undefined;
const aaguidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function icon(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("data:image/svg+xml;base64,")
    ? value
    : undefined;
}

function parseCatalog(value: unknown): PasskeyAuthenticatorCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The passkey authenticator catalog is invalid.");
  }
  const catalog = Object.create(null) as PasskeyAuthenticatorCatalog;
  for (const [aaguid, entry] of Object.entries(value)) {
    if (!aaguidPattern.test(aaguid)) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.name !== "string" || !candidate.name.trim()) continue;
    catalog[aaguid.toLowerCase()] = {
      name: candidate.name.trim(),
      icon_dark: icon(candidate.icon_dark),
      icon_light: icon(candidate.icon_light),
    };
  }
  if (Object.keys(catalog).length === 0) {
    throw new Error("The passkey authenticator catalog is empty.");
  }
  return catalog;
}

export function loadPasskeyAuthenticatorCatalog() {
  catalogPromise ??= fetch(PASSKEY_AUTHENTICATOR_AAGUIDS_URL, {
    cache: "force-cache",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error("The passkey authenticator catalog is unavailable.");
    }
    return parseCatalog(await response.json());
  });
  return catalogPromise.catch((error) => {
    catalogPromise = undefined;
    throw error;
  });
}

export function isGeneratedPasskeyName(name: string) {
  return (
    name === "This device" ||
    name === "Security key" ||
    /^Passkey(?: [0-9a-f]{8})?$/.test(name)
  );
}
