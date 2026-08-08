# ComplicatedAuth Console

First-party Next.js management console for Tenant Members.

```sh
npm install
npm run generate:api
npm run dev
```

The browser calls `/api/v1/...`; Next.js proxies that path to `INTERNAL_API_URL`. Authentication remains in the backend's HTTP-only cookie.

## Browser acceptance test

`npm run test:e2e` runs the management and relying-party flow against running console/backend services. It launches a test-only RP backend that keeps Project User session references server-side behind its own HTTP-only cookie and uses Chromium's virtual WebAuthn authenticator for registration and discoverable login.
