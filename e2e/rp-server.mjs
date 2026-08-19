import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const backendURL = process.env.BACKEND_URL ?? "http://localhost:8080";
const projectUID = process.env.PROJECT_UID;
const apiKey = process.env.PROJECT_API_KEY;
const port = Number(process.env.RP_PORT ?? 4174);
const sessions = new Map();
const logins = new Map();

if (!projectUID || !apiKey)
  throw new Error("PROJECT_UID and PROJECT_API_KEY are required");

const page = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>ComplicatedAuth test RP</title>
<body><main><h1>Test relying party</h1>
<label>Email <input id="email" type="email" value="person@example.com"></label>
<label>Password <input id="password" type="password" value="a secure project password"></label>
<button id="password-login">Password login</button><button id="register">Register passkey</button>
<button id="logout">Log out</button><button id="passkey-login">Passkey login</button>
<output id="status" data-testid="status">Ready</output></main>
<script>
const status = document.querySelector('#status');
const bytes = value => { const base=value.replace(/-/g,'+').replace(/_/g,'/'); const raw=atob(base+'='.repeat((4-base.length%4)%4)); return Uint8Array.from(raw, c=>c.charCodeAt(0)); };
const base64url = value => { let raw=''; for(const byte of new Uint8Array(value)) raw+=String.fromCharCode(byte); return btoa(raw).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''); };
const options = value => { value.challenge=bytes(value.challenge); if(value.user?.id)value.user.id=bytes(value.user.id); for(const key of ['allowCredentials','excludeCredentials']) for(const item of value[key]??[]) item.id=bytes(item.id); return value; };
const credentialJSON = credential => { const response={clientDataJSON:base64url(credential.response.clientDataJSON)}; if('attestationObject' in credential.response){response.attestationObject=base64url(credential.response.attestationObject);response.transports=credential.response.getTransports?.()??[];}else{response.authenticatorData=base64url(credential.response.authenticatorData);response.signature=base64url(credential.response.signature);if(credential.response.userHandle)response.userHandle=base64url(credential.response.userHandle);} return {id:credential.id,rawId:base64url(credential.rawId),type:credential.type,authenticatorAttachment:credential.authenticatorAttachment,clientExtensionResults:credential.getClientExtensionResults(),response}; };
async function call(path, body){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const value=await response.json().catch(()=>({}));if(!response.ok)throw new Error(value.error?.message??'Request failed');return value;}
async function action(work){try{status.value='Working…';status.textContent='Working…';const message=await work();status.value=message;status.textContent=message;}catch(error){status.value='Error: '+error.message;status.textContent='Error: '+error.message;}}
document.querySelector('#password-login').onclick=()=>action(async()=>{await call('/password',{email:email.value,password:password.value});return 'Password factor verified';});
document.querySelector('#register').onclick=()=>action(async()=>{const begin=await call('/register/options');const credential=await navigator.credentials.create({publicKey:options(begin.public_key)});await call('/register/verify',{ceremony_uid:begin.ceremony_uid,credential:credentialJSON(credential)});return 'Passkey registered';});
document.querySelector('#logout').onclick=()=>action(async()=>{await call('/logout');return 'Logged out';});
document.querySelector('#passkey-login').onclick=()=>action(async()=>{await call('/password',{email:email.value,password:password.value});const begin=await call('/authenticate/options',{});const credential=await navigator.credentials.get({publicKey:options(begin.public_key)});await call('/authenticate/verify',{ceremony_uid:begin.ceremony_uid,credential:credentialJSON(credential)});return 'Password + passkey session active';});
</script></html>`;

function cookie(request, name) {
  for (const item of (request.headers.cookie ?? "").split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

async function jsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function complicatedAuth(path, body, {loginReference = "", sessionReference = ""} = {}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (sessionReference) headers["X-ComplicatedAuth-Session"] = sessionReference;
  if (loginReference) headers["X-ComplicatedAuth-Login"] = loginReference;
  const response = await fetch(
    `${backendURL}/v1/projects/${projectUID}/runtime${path}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    },
  );
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(
      new Error(value.error?.message ?? "ComplicatedAuth request failed"),
      { status: response.status, value },
    );
  return value;
}

function send(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function activeReference(request) {
  return sessions.get(cookie(request, "rp_session")) ?? "";
}

function activeLogin(request) {
  return logins.get(cookie(request, "rp_login")) ?? "";
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      });
      return response.end(page);
    }
    if (request.method === "GET" && request.url === "/health")
      return send(response, 200, { status: "ok" });
    if (request.method === "GET" && request.url === "/session") {
      const reference = activeReference(request);
      if (!reference)
        return send(response, 401, { error: { message: "No RP session" } });
      const value = await complicatedAuth("/sessions/introspect", {
        session_reference: reference,
      });
      return send(response, 200, value);
    }
    if (request.method !== "POST")
      return send(response, 404, { error: { message: "Not found" } });
    const body = await jsonBody(request);
    if (request.url === "/password") {
      const start = await complicatedAuth("/login/start", {email: body.email});
      await complicatedAuth("/login/password", {password: body.password}, {loginReference: start.login_reference});
      const id = randomUUID();
      logins.set(id, start.login_reference);
      return send(
        response,
        200,
        { status: "factor_verified" },
        { "Set-Cookie": `rp_login=${id}; HttpOnly; SameSite=Lax; Path=/` },
      );
    }
    if (
      request.url === "/register/options" ||
      request.url === "/register/verify"
    ) {
      const loginReference = activeLogin(request);
      if (!loginReference)
        return send(response, 401, { error: { message: "No active login" } });
      const suffix =
        request.url === "/register/options"
          ? "/login/fido/enrollment/options"
          : "/login/fido/enrollment/verify";
      const value = await complicatedAuth(suffix, {...body, mode: "passkey"}, {loginReference});
      if (request.url.endsWith("options")) return send(response, 200, value);
      const oldLogin = cookie(request, "rp_login");
      logins.delete(oldLogin);
      const id = randomUUID();
      sessions.set(id, value.session_reference);
      return send(response, 200, {project_user: value.project_user, expires_at: value.expires_at}, {
        "Set-Cookie": [`rp_session=${id}; HttpOnly; SameSite=Lax; Path=/`, "rp_login=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"],
      });
    }
    if (request.url === "/authenticate/options") {
      const loginReference = activeLogin(request);
      if (!loginReference) return send(response, 401, {error: {message: "No active login"}});
      return send(
        response,
        200,
        await complicatedAuth("/login/fido/options", {mode: "passkey"}, {loginReference}),
      );
    }
    if (request.url === "/authenticate/verify") {
      const loginId = cookie(request, "rp_login");
      const loginReference = logins.get(loginId) ?? "";
      if (!loginReference) return send(response, 401, {error: {message: "No active login"}});
      const value = await complicatedAuth(
        "/login/fido/verify",
        {...body, mode: "passkey"},
        {loginReference},
      );
      const old = cookie(request, "rp_session");
      if (old) sessions.delete(old);
      logins.delete(loginId);
      const id = randomUUID();
      sessions.set(id, value.session_reference);
      return send(
        response,
        200,
        { project_user: value.project_user, expires_at: value.expires_at },
        { "Set-Cookie": [`rp_session=${id}; HttpOnly; SameSite=Lax; Path=/`, "rp_login=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"] },
      );
    }
    if (request.url === "/logout") {
      const id = cookie(request, "rp_session"),
        reference = sessions.get(id);
      if (reference)
        await complicatedAuth("/sessions/revoke", {
          session_reference: reference,
        });
      sessions.delete(id);
      const loginId = cookie(request, "rp_login");
      logins.delete(loginId);
      return send(
        response,
        200,
        { logged_out: true },
        {
          "Set-Cookie": [
            "rp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
            "rp_login=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
          ],
        },
      );
    }
    return send(response, 404, { error: { message: "Not found" } });
  } catch (error) {
    return send(
      response,
      error.status ?? 500,
      error.value ?? { error: { message: error.message } },
    );
  }
});

server.listen(port, "127.0.0.1", () =>
  process.stdout.write(`test RP listening on ${port}\n`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
