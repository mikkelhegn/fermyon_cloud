import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parse } from "smol-toml";
import { selectComponents } from "../scripts/select-components.mjs";
import { combineReports, prepareReports } from "../scripts/language-reports.mjs";

const manifest = parse(await readFile(new URL("../spin.toml", import.meta.url), "utf8"));
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

test("C++ build avoids the flag rejected by the pinned Zig compiler", () => {
  const command = manifest.component.cpp.build.command;
  assert.match(command, /^zig build-exe /);
  assert.ok(!command.split(/\s+/).includes("-fno-exceptions"));
});

test("Go resolves module checksums in the workspace before compiling", () => {
  assert.match(manifest.component.go.build.command, /^cd components\/go && go mod tidy && tinygo build /);
});

test("secrets and outbound capabilities are limited to their consumers", () => {
  for (const variable of ["api_token", "redis_url", "mysql_url", "postgres_url"]) {
    assert.equal(manifest.variables[variable].secret, true);
  }
  for (const [name, component] of Object.entries(manifest.component)) {
    if (name !== "rust") assert.deepEqual(component.allowed_outbound_hosts, []);
    if (!["rust", "python"].includes(name)) assert.equal(component.variables, undefined);
  }
  assert.deepEqual(manifest.component.python.key_value_stores, ["default"]);
  assert.deepEqual(manifest.component.rust.sqlite_databases, ["default"]);
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
  assert.equal(await combineReports(directory, selected), true);
  await assert.rejects(readFile(join(directory, "python/local-test-results.md")), { code: "ENOENT" });
  const markdown = await readFile(join(directory, "local-test-results.md"), "utf8");
  assert.match(markdown, /2 languages checked: \*\*1 passed\*\*, \*\*1 failed\*\*, \*\*0 blocked\*\*/);
  assert.ok(markdown.includes("go/local-test-logs/go-build.log"));
  assert.ok(markdown.includes("Shared manifest and JavaScript handler tests: **FAIL**"));
  assert.ok(markdown.includes("test \\| detail next"));
  assert.ok(!markdown.includes("signal-9"));
  assert.ok(!markdown.includes("Not installed"));
  await writeFile(join(directory, "python/local-test-results.md"), "old report");
  await prepareReports(directory, selected);
  for (const filename of ["local-test-results.md", "python/local-test-results.md", "python/local-test-results.json", "go/local-test-results.json"]) {
    await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  }
});

globalThis.addEventListener = () => {};
const { handler } = await import("../components/javascript/index.js");

test("JavaScript handler returns JSON and rejects writes", async () => {
  const response = await handler(new Request("http://localhost/api/javascript"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).language, "JavaScript");
  const rejected = await handler(new Request("http://localhost/api/javascript", { method: "POST" }));
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get("allow"), "GET");
});