import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "smol-toml";
import { selectComponents, selectTestComponents } from "../scripts/select-components.mjs";
import { combineReports, getTestLanguages, prepareReports, testExclusions, validateReports } from "../scripts/language-reports.mjs";
import { compareReports, missingReport } from "../scripts/compare-smoke-reports.mjs";

const manifest = parse(await readFile(new URL("../spin.toml", import.meta.url), "utf8"));
const csharpProject = await readFile(new URL("../components/csharp/Component.csproj", import.meta.url), "utf8");
const languages = ["rust", "javascript", "typescript", "python", "go", "c", "cpp", "csharp", "fsharp", "grain", "ruby", "swift", "zig", "php"];

test("each documented language has a distinct component and HTTP route", () => {
  assert.deepEqual(Object.keys(manifest.component).sort(), languages.toSorted());
  for (const language of languages) {
    assert.ok(manifest.trigger.http.some((trigger) => trigger.component === language && trigger.route.startsWith(`/api/${language}`)));
  }
});

test("Cloud-unsupported triggers and service chaining are excluded", () => {
  assert.deepEqual(Object.keys(manifest.trigger), ["http"]);
  for (const component of Object.values(manifest.component)) {
    assert.ok(!component.allowed_outbound_hosts.some((host) => host.includes("spin.internal")));
  }
});

test("C++ build avoids unsupported flags and unnecessary libc++ linkage", () => {
  const command = manifest.component.cpp.build.command;
  assert.match(command, /^zig build-exe /);
  const flags = command.split(/\s+/);
  assert.ok(!flags.includes("-fno-exceptions"));
  assert.ok(!flags.includes("-lc++"));
});

test("Go resolves module checksums in the workspace before compiling", () => {
  assert.match(manifest.component.go.build.command, /^cd components\/go && go mod tidy && tinygo build /);
});

test("Go builds a WASI reactor for Spin's exported HTTP handler", () => {
  const command = manifest.component.go.build.command;
  assert.ok(command.split(/\s+/).includes("-target=wasi"));
  assert.ok(command.split(/\s+/).includes("-buildmode=c-shared"));
});

test("Go limits TinyGo compilation parallelism to reduce peak memory", () => {
  assert.ok(manifest.component.go.build.command.split(/\s+/).includes("-p=1"));
});

test("C# disables the Wizer pass that fails on its generated Wasm module", () => {
  assert.match(csharpProject, /<UseWizer>false<\/UseWizer>/);
});

test("F# remains an app component but is excluded from automated Spin tests", () => {
  assert.ok(manifest.component.fsharp);
  assert.equal(getTestLanguages(manifest).length, languages.length - 1);
  assert.ok(!getTestLanguages(manifest).includes("fsharp"));
  assert.match(testExclusions.fsharp, /Spin 4\.2\.5 traps in its WAGI Preview 1 adapter/);
});

test("smoke runner validates core language and API contracts and writes named outcomes", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "host-smoke-"));
  let kv = null;
  const notes = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      const path = request.url.split("?", 1)[0];
      const authorized = request.headers.authorization === "Bearer test-token-12345678901234567890";
      const json = (status, value) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(value));
      };
    response.setHeader("content-type", "application/json");
      if (path === "/healthz") return json(200, { status: "ok" });
      if (path === "/api/rust") return json(200, { language: "Rust", greeting: "Hello from Fermyon Cloud", composed_greeting: "Hello from composed component", apis: ["kv", "sqlite"] });
      if (path === "/api/javascript") return json(200, { language: "JavaScript", apis: ["variables", "kv", "sqlite"] });
      if (path === "/api/python") return json(200, { language: "Python", apis: ["variables", "kv"] });
      const probe = path.match(/^\/api\/(javascript|python)\/probe\/(variables|kv|sqlite)$/);
      if (probe) {
        if (!authorized) return json(401, { error: "Unauthorized" });
        const [, language, api] = probe;
        const result = api === "variables" ? { greeting: "Hello from Fermyon Cloud" } : api === "kv" ? { value: kv } : { value: 1 };
        return json(200, { language: language === "javascript" ? "JavaScript" : "Python", api, result });
      }
      if (path.startsWith("/api/rust/") || path === "/api/python/kv") {
        if (!authorized) return json(401, { error: "Unauthorized" });
        if (path === "/api/rust/kv") {
          if (request.method === "PUT" && body.length > 65536) return json(413, { error: "too large" });
          if (request.method === "PUT") { kv = body; return json(200, { stored: true }); }
          if (request.method === "DELETE") { kv = null; return json(200, { deleted: true }); }
          return json(200, { value: kv });
        }
        if (path === "/api/rust/wasi-keyvalue") return json(200, { value: kv });
        if (path === "/api/rust/wasi-config") return json(200, { greeting: "Hello from Fermyon Cloud" });
        if (path === "/api/python/kv") return json(200, { language: "Python", value: kv });
        if (path === "/api/rust/sqlite") {
          if (request.method === "POST" && !body.trim()) return json(400, { error: "empty" });
          if (request.method === "POST") notes.push(body);
          return json(200, { notes: notes.map((note) => ({ body: note })) });
        }
      }
      return json(404, { error: "not found" });
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const address = server.address();
  const reportPath = join(directory, "javascript.json");
  const child = spawn(process.execPath, [fileURLToPath(new URL("../scripts/smoke.mjs", import.meta.url))], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, BASE_URL: `http://127.0.0.1:${address.port}`, LANGUAGES: "rust,javascript,python", SMOKE_TARGET: "mock-host", SMOKE_REPORT_PATH: reportPath, SPIN_VARIABLE_API_TOKEN: "test-token-12345678901234567890", TEST_OUTBOUND: "0", TEST_EXTERNAL: "0", TEST_AI: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const exitCode = await new Promise((resolve) => child.once("close", resolve));
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(exitCode, 0, `${output}\n${JSON.stringify(report.checks)}`);
  assert.equal(report.target, "mock-host");
  assert.equal(report.totals.FAIL, 0);
  assert.ok(report.checks.some(({ name, status }) => name === "rust:kv:deleted-read" && status === "PASS"));
  assert.ok(report.checks.some(({ name, status }) => name === "rust:wasi-config:read" && status === "PASS"));
  assert.ok(report.checks.some(({ name, status }) => name === "javascript:sqlite" && status === "PASS"));
  assert.ok(report.checks.some(({ name, status }) => name === "python:variables" && status === "PASS"));
  assert.ok(report.checks.some(({ name, status }) => name === "python:shared-kv:read" && status === "PASS"));
});

test("host comparison reports discrepancies and never counts matching failures as passes", () => {
  const reference = { target: "spin", baseUrl: "http://spin", spin: "3.4.1", checks: [{ name: "health", status: "PASS" }, { name: "kv", status: "FAIL" }] };
  const candidate = { target: "cloud", baseUrl: "https://cloud.example", spin: "cloud", checks: [{ name: "health", status: "PASS" }, { name: "kv", status: "PASS" }] };
  const report = compareReports(reference, candidate);
  assert.deepEqual(report.totals, { PASS: 1, FAIL: 1, DISCREPANCY: 1 });
  assert.equal(report.passed, false);

  const sameFailures = compareReports(reference, { ...candidate, checks: reference.checks });
  assert.deepEqual(sameFailures.totals, { PASS: 1, FAIL: 1, DISCREPANCY: 0 });
  assert.equal(sameFailures.passed, false);
  const deployed = { ...candidate, checks: [{ name: "smoke:report", status: "PASS" }] };
  const missing = compareReports(missingReport("cloud.json"), deployed);
  assert.equal(missing.passed, false);
  assert.equal(missing.checks.find(({ name }) => name === "smoke:report").candidate, "PASS");
  assert.equal(missing.checks.find(({ name }) => name === "smoke:report").reference, "MISSING");
});

test("language report validation requires all selected results and unit tests to pass", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "language-report-validation-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const languagesToValidate = ["python", "go"];
  const report = (component, result) => ({
    unitTests: "PASS",
    results: [{ component, result, detail: result === "PASS" ? "ok" : "build failed" }],
  });
  for (const language of languagesToValidate) {
    await mkdir(join(directory, language));
    await writeFile(join(directory, language, "local-test-results.json"), JSON.stringify(report(language, "PASS")));
  }
  await writeFile(join(directory, "local-test-results.md"), "## Excluded From Automated Spin Tests\n");
  assert.deepEqual(await validateReports(directory, languagesToValidate), { passed: true, problems: [] });
  await writeFile(join(directory, "go", "local-test-results.json"), JSON.stringify(report("go", "FAIL")));
  const validation = await validateReports(directory, languagesToValidate);
  assert.equal(validation.passed, false);
  assert.ok(validation.problems.some((problem) => problem.includes("go: FAIL (build failed)")));
});

test("secrets and outbound capabilities are limited to their consumers", () => {
  for (const variable of ["api_token", "redis_url", "mysql_url", "postgres_url"]) {
    assert.equal(manifest.variables[variable].secret, true);
  }
  const outboundByComponent = {
    rust: ["https://example.com", "{{ redis_host }}", "{{ mysql_host }}", "{{ postgres_host }}"],
    javascript: ["https://example.com", "{{ redis_host }}", "{{ mysql_host }}", "{{ postgres_host }}"],
    typescript: ["https://example.com", "{{ redis_host }}", "{{ mysql_host }}", "{{ postgres_host }}"],
    go: ["{{ redis_host }}", "{{ mysql_host }}", "{{ postgres_host }}"],
    csharp: ["https://example.com", "{{ redis_host }}", "{{ postgres_host }}"],
  };
  for (const [name, component] of Object.entries(manifest.component)) {
    assert.deepEqual(component.allowed_outbound_hosts, outboundByComponent[name] ?? []);
    if (!["rust", "javascript", "typescript", "python", "go", "csharp"].includes(name)) assert.equal(component.variables, undefined);
  }
  assert.deepEqual(manifest.component.python.key_value_stores, ["default"]);
  assert.deepEqual(manifest.component.rust.sqlite_databases, ["default"]);
  for (const language of ["javascript", "typescript", "go"]) {
    assert.deepEqual(manifest.component[language].key_value_stores, ["default"]);
    assert.deepEqual(manifest.component[language].sqlite_databases, ["default"]);
    assert.ok(manifest.component[language].ai_models.includes("llama2-chat"));
  }
  assert.deepEqual(manifest.component.csharp.allowed_outbound_hosts, outboundByComponent.csharp);
  assert.ok(manifest.component.rust.dependencies["lab:greeting/formatter@1.0.0"]);
});

test("profile selection preserves configuration and removes unused routes", () => {
  const selected = selectComponents(manifest, ["rust", "python"]);
  assert.deepEqual(Object.keys(selected.component), ["rust", "python"]);
  assert.ok(selected.trigger.http.every((trigger) => ["rust", "python"].includes(trigger.component)));
  assert.deepEqual(selected.variables, structuredClone(manifest.variables));
  assert.equal(Object.keys(manifest.component).length, languages.length);
  assert.throws(() => selectComponents(manifest, ["missing"]), /Unknown component/);
  assert.throws(() => selectComponents(manifest, []), /at least one/);
  assert.throws(() => selectTestComponents(manifest, ["fsharp"]), /excluded from automated Spin tests/);
});

test("combined report waits for every language and links failures to their logs", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "language-reports-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const selected = ["python", "go"];
  const makeReport = (component, result) => ({
    generatedAt: "2026-11-02T00:00:00.000Z", platform: "Linux x86_64", spin: "spin 4.2.5",
    unitTests: component === "go" ? "FAIL" : "PASS", toolVersions: { node: "v22.20.0", swiftc: "Not installed" },
    results: [{ component, language: component, build: result, runtime: "NOT RUN", source: "NOT RUN", result, detail: "test | detail\nnext" }],
  });
  await mkdir(join(directory, "python"));
  await writeFile(join(directory, "python/local-test-results.json"), JSON.stringify(makeReport("python", "PASS")));
  assert.equal(await combineReports(directory, selected), false);
  await assert.rejects(readFile(join(directory, "local-test-results.md")), { code: "ENOENT" });
  await mkdir(join(directory, "go"));
  await writeFile(join(directory, "go/local-test-results.json"), JSON.stringify(makeReport("go", "FAIL")));
  await writeFile(join(directory, "python/local-test-results.md"), "old per-language report");
  await mkdir(join(directory, "fsharp"));
  await writeFile(join(directory, "fsharp/local-test-results.json"), "stale result");
  await writeFile(join(directory, "fsharp/local-test-results.md"), "stale report");
  assert.equal(await combineReports(directory, selected), true);
  await assert.rejects(readFile(join(directory, "python/local-test-results.md")), { code: "ENOENT" });
  const markdown = await readFile(join(directory, "local-test-results.md"), "utf8");
  assert.match(markdown, /2 languages checked: \*\*1 passed\*\*, \*\*1 failed\*\*, \*\*0 blocked\*\*/);
  assert.ok(markdown.includes("go/local-test-logs/go-build.log"));
  assert.ok(markdown.includes("Shared manifest and JavaScript handler tests: **FAIL**"));
  assert.ok(markdown.includes("## Excluded From Automated Spin Tests"));
  assert.ok(markdown.includes("fsharp: The .NET WASI module runs directly under Wasmtime 50.0.1"));
  assert.ok(markdown.includes("test \\| detail next"));
  assert.ok(!markdown.includes("signal-9"));
  assert.ok(!markdown.includes("Not installed"));
  await writeFile(join(directory, "python/local-test-results.md"), "old report");
  await prepareReports(directory, selected);
  for (const filename of ["local-test-results.md", "python/local-test-results.md", "python/local-test-results.json", "go/local-test-results.json", "fsharp/local-test-results.md", "fsharp/local-test-results.json"]) {
    await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  }
});

const { createHandler } = await import("../components/javascript/handler.js");
const handler = createHandler({
  language: "JavaScript",
  runtime: "WASI Preview 2",
  apis: ["variables"],
  getVariable: () => "",
  probe: () => ({ greeting: "Hello from Fermyon Cloud" }),
});

test("JavaScript handler returns JSON and rejects writes", async () => {
  const response = await handler(new Request("http://localhost/api/javascript"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).language, "JavaScript");
  const rejected = await handler(new Request("http://localhost/api/javascript", { method: "POST" }));
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get("allow"), "GET");
});