# ComplicatedAuth Console

First-party Next.js management console for Tenant Members.

```sh
npm install
npm run generate:api
npm run dev
```

The browser calls `/api/v1/...`; Next.js proxies that path to `INTERNAL_API_URL`. Signup and invitation acceptance receive a narrowly authorized bootstrap cookie. Password verification alone never creates a session; first enrollment or a passkey/security-key assertion establishes strong assurance before ordinary console routes are available. The one-time login-attempt client secret is held only in function memory.

## Browser acceptance test

`npm run test:e2e` runs the management and relying-party flow against running console/backend services. It launches a test-only RP backend that keeps Project User session references server-side behind its own HTTP-only cookie and uses separate Chromium platform and USB virtual authenticators for management setup, credential lifecycle, and discoverable Project User login.

Network traces are deliberately disabled because Playwright serializes request headers and cookies. Failure screenshots and assertion context remain enabled without persisting login-attempt or session secrets.
