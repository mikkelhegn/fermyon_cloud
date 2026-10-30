import assert from "node:assert/strict";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.SPIN_VARIABLE_API_TOKEN;
const languages = (process.env.LANGUAGES ?? "rust,javascript,typescript").split(",");

async function request(path, options = {}, expected = 200) {
  const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, expected, `${options.method ?? "GET"} ${path}: ${await response.clone().text()}`);
  return response;
}

await request("/healthz");
for (const language of languages) {
  const body = await (await request(`/api/${language}`)).json();
  assert.ok(body.language, `Missing language for ${language}`);
  if (language === "rust") assert.match(body.composed_greeting, /composed component/);
}
await request("/api/rust/kv", {}, token?.length >= 24 ? 401 : 503);
if (token?.length >= 24) {
  const headers = { authorization: `Bearer ${token}` };
  await request("/api/rust/kv", { method: "PUT", headers, body: "shared from Rust" });
  assert.equal((await (await request("/api/rust/kv", { headers })).json()).value, "shared from Rust");
  assert.equal((await (await request("/api/rust/wasi-keyvalue", { headers })).json()).value, "shared from Rust");
  assert.ok((await (await request("/api/rust/wasi-config", { headers })).json()).greeting);
  if (languages.includes("python")) {
    assert.equal((await (await request("/api/python/kv", { headers })).json()).value, "shared from Rust");
  }
  await request("/api/rust/kv", { method: "PUT", headers, body: "x".repeat(65537) }, 413);
  await request("/api/rust/sqlite", { method: "POST", headers, body: "smoke test note" });
  const notes = (await (await request("/api/rust/sqlite", { headers })).json()).notes;
  assert.ok(notes.some((note) => note.body === "smoke test note"));
  await request("/api/rust/sqlite", { method: "POST", headers, body: " " }, 400);
  if (process.env.TEST_OUTBOUND === "1") {
    const upstream = await (await request("/api/rust/http", { headers })).json();
    assert.equal(upstream.upstream_status, 200);
  }
  if (process.env.TEST_EXTERNAL === "1") {
    for (const service of ["redis", "mysql", "postgres"]) await request(`/api/rust/${service}`, { headers });
  }
  if (process.env.TEST_AI === "1") {
    for (const operation of ["infer", "code", "embed"]) {
      await request(`/api/rust/ai/${operation}`, { method: "POST", headers, body: "Say hello." });
    }
  }
}
console.log(`Smoke checks passed for ${languages.join(", ")} at ${base}`);