import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.SPIN_VARIABLE_API_TOKEN;
const languages = (process.env.LANGUAGES ?? "rust,javascript,typescript").split(",");
const tokenConfigured = token?.length >= 24;
const expectedGreeting = process.env.EXPECTED_GREETING ?? "Hello from Fermyon Cloud";
const checks = [];
const skippedChecks = [];
const apiCapabilities = {};
const optionalApiGate = { http: "TEST_OUTBOUND", llm: "TEST_AI", mysql: "TEST_EXTERNAL", postgres: "TEST_EXTERNAL", redis: "TEST_EXTERNAL" };
const languageNames = {
  rust: "Rust", javascript: "JavaScript", typescript: "TypeScript", python: "Python",
  go: "Go", c: "C", cpp: "C++", csharp: "C#", grain: "Grain",
  ruby: "Ruby", swift: "Swift", zig: "Zig", php: "PHP",
};

async function check(name, run) {
  try {
    await run();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({
      name,
      status: "FAIL",
      detail: token ? detail.replaceAll(token, "[REDACTED]") : detail,
    });
  }
}

async function request(path, options = {}, expected = 200) {
  const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(30000) });
  if (response.status !== expected) {
    const body = (await response.text()).slice(0, 400);
    throw new Error(`${options.method ?? "GET"} ${path}: expected HTTP ${expected}, got ${response.status}${body ? `; ${body}` : ""}`);
  }
  return response;
}

await check("health", async () => {
  const body = await (await request("/healthz")).json();
  assert.equal(body.status, "ok");
});
for (const language of languages) {
  await check(`language:${language}:http`, async () => {
    const body = await (await request(`/api/${language}`)).json();
    assert.equal(body.language, languageNames[language]);
    if (language === "rust") {
      assert.equal(body.greeting, expectedGreeting);
      assert.match(body.composed_greeting, /composed component/);
    }
    apiCapabilities[language] = body.apis ?? [];
  });
}

for (const language of languages.filter((name) => name !== "rust")) {
  const apis = apiCapabilities[language] ?? [];
  if (apis.length > 0) {
    await check(`${language}:auth:missing-token`, () => request(`/api/${language}/probe/${apis[0]}`, {}, 401));
  }
  for (const api of apis) {
    const gate = optionalApiGate[api];
    if (gate && process.env[gate] !== "1") {
      skippedChecks.push({ name: `${language}:${api}`, reason: `${gate}=1 is required` });
      continue;
    }
    if (!tokenConfigured) {
      skippedChecks.push({ name: `${language}:${api}`, reason: "SPIN_VARIABLE_API_TOKEN is not configured" });
      continue;
    }
    await check(`${language}:${api}`, async () => {
      const method = api === "llm" ? "POST" : "GET";
      const response = await request(`/api/${language}/probe/${api}`, {
        method,
        headers: { authorization: `Bearer ${token}` },
        ...(method === "POST" ? { body: "Reply briefly and generate an embedding." } : {}),
      });
      const body = await response.json();
      assert.equal(body.language, languageNames[language]);
      assert.equal(body.api, api);
      const result = body.result ?? {};
      if (api === "variables") assert.equal(result.greeting, expectedGreeting);
      if (api === "kv") assert.ok(result.value === null || typeof result.value === "string");
      if (["sqlite", "mysql", "postgres"].includes(api)) assert.equal(result.value, 1);
      if (api === "llm") {
        assert.equal(typeof result.text, "string");
        assert.ok(result.text.length > 0);
        assert.ok(result.embeddingDimensions > 0);
      }
      if (api === "http") assert.equal(result.upstreamStatus, 200);
      if (api === "redis") assert.ok(result.response !== undefined);
    });
  }
}

if (languages.includes("rust")) {
  await check("rust:auth:missing-token", () => request("/api/rust/kv", {}, tokenConfigured ? 401 : 503));
}
if (tokenConfigured && languages.includes("rust")) {
  const headers = { authorization: `Bearer ${token}` };
  await check("rust:kv:write", () => request("/api/rust/kv", { method: "PUT", headers, body: "shared from Rust" }));
  await check("rust:kv:read", async () => {
    assert.equal((await (await request("/api/rust/kv", { headers })).json()).value, "shared from Rust");
  });
  await check("rust:wasi-keyvalue:read", async () => {
    assert.equal((await (await request("/api/rust/wasi-keyvalue", { headers })).json()).value, "shared from Rust");
  });
  await check("rust:wasi-config:read", async () => {
    assert.equal((await (await request("/api/rust/wasi-config", { headers })).json()).greeting, expectedGreeting);
  });
  if (languages.includes("python")) {
    await check("python:shared-kv:read", async () => {
      assert.equal((await (await request("/api/python/kv", { headers })).json()).value, "shared from Rust");
    });
  }
  await check("rust:kv:delete", () => request("/api/rust/kv", { method: "DELETE", headers }));
  await check("rust:kv:deleted-read", async () => {
    assert.equal((await (await request("/api/rust/kv", { headers })).json()).value, null);
  });
  await check("rust:input-limit", () => request("/api/rust/kv", { method: "PUT", headers, body: "x".repeat(65537) }, 413));
  await check("rust:sqlite:write-read", async () => {
    await request("/api/rust/sqlite", { method: "POST", headers, body: "smoke test note" });
    const notes = (await (await request("/api/rust/sqlite", { headers })).json()).notes;
    assert.ok(notes.some((note) => note.body === "smoke test note"));
  });
  await check("rust:sqlite:input-validation", () => request("/api/rust/sqlite", { method: "POST", headers, body: " " }, 400));
  if (process.env.TEST_OUTBOUND === "1") {
    await check("rust:outbound-http", async () => {
      const upstream = await (await request("/api/rust/http", { headers })).json();
      assert.equal(upstream.upstream_status, 200);
    });
  }
  if (process.env.TEST_EXTERNAL === "1") {
    for (const service of ["redis", "mysql", "postgres"]) {
      await check(`rust:${service}`, async () => {
        const body = await (await request(`/api/rust/${service}`, { headers })).json();
        assert.equal(body[service], "ok");
        if (service !== "redis") assert.ok(body.rows > 0);
      });
    }
  }
  if (process.env.TEST_AI === "1") {
    for (const operation of ["infer", "code", "embed"]) {
      await check(`rust:ai:${operation}`, async () => {
        const body = await (await request(`/api/rust/ai/${operation}`, { method: "POST", headers, body: "Say hello." })).json();
        if (operation === "embed") {
          assert.ok(Array.isArray(body.embeddings) && body.embeddings.length === 1);
          assert.ok(Array.isArray(body.embeddings[0]) && body.embeddings[0].length > 0);
        } else {
          assert.equal(typeof body.text, "string");
          assert.ok(body.text.length > 0);
          assert.ok(body.generated_tokens <= 128);
        }
      });
    }
  }
}
if (tokenConfigured && languages.includes("python") && !languages.includes("rust")) {
  await check("python:legacy-kv:read", async () => {
    const body = await (await request("/api/python/kv", { headers: { authorization: `Bearer ${token}` } })).json();
    assert.equal(body.language, "Python");
    assert.ok(body.value === null || typeof body.value === "string");
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  target: process.env.SMOKE_TARGET ?? "unspecified",
  baseUrl: new URL(base).origin,
  spin: process.env.SPIN_VERSION ?? "unspecified",
  languages,
  apiCapabilities,
  apiTokenConfigured: Boolean(tokenConfigured),
  enabledChecks: { outbound: process.env.TEST_OUTBOUND === "1", external: process.env.TEST_EXTERNAL === "1", ai: process.env.TEST_AI === "1" },
  checks,
  skippedChecks,
  totals: {
    PASS: checks.filter((result) => result.status === "PASS").length,
    FAIL: checks.filter((result) => result.status === "FAIL").length,
  },
};
if (process.env.SMOKE_REPORT_PATH) {
  const filename = resolve(process.env.SMOKE_REPORT_PATH);
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`Smoke checks for ${report.target}: ${report.totals.PASS} passed, ${report.totals.FAIL} failed at ${report.baseUrl}`);
if (report.totals.FAIL > 0) process.exitCode = 1;