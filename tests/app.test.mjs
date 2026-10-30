import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "smol-toml";
import { selectComponents } from "../scripts/select-components.mjs";

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