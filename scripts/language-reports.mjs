import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");

export function renderReport(entries) {
  const results = entries.flatMap(({ report }) => report.results);
  const totals = Object.fromEntries(["PASS", "FAIL", "BLOCKED"].map((status) => [status, results.filter((row) => row.result === status).length]));
  const rows = entries.flatMap(({ report, logPrefix }) => report.results.map((row) =>
    `| ${escape(row.language)} | ${row.build} | ${row.runtime} | ${row.source} | **${row.result}** | ${escape(row.detail)} ([build](${logPrefix}/${row.component}-build.log)${row.runtime === "NOT RUN" ? "" : `, [runtime](${logPrefix}/${row.component}-runtime.log)`}) |`));
  const environments = entries.map(({ report, logPrefix }) =>
    `| ${report.results.map((row) => escape(row.language)).join(", ")} | ${escape(report.platform)} | ${escape(report.spin)} | ${escape(report.generatedAt)} | [${report.unitTests}](${logPrefix}/unit-tests.log) |`);
  const versions = entries.flatMap(({ report }) => Object.entries(report.toolVersions)
    .filter(([, version]) => version !== "Not installed")
    .map(([command, version]) => `| ${report.results.map((row) => escape(row.language)).join(", ")} | ${escape(command)} | ${escape(version)} |`));
  const failures = results.filter((row) => row.result !== "PASS" || row.source === "FAIL");
  return `# Local Language Test Results

Generated: ${new Date().toISOString()}

## Summary

${results.length} languages checked: **${totals.PASS} passed**, **${totals.FAIL} failed**, **${totals.BLOCKED} blocked**.
Shared manifest and JavaScript handler tests: **${entries.every(({ report }) => report.unitTests === "PASS") ? "PASS" : "FAIL"}**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Follow-Up Actions

${failures.length ? failures.map((row) => `- ${escape(row.language)}: ${escape(row.detail)}${row.source === "FAIL" ? "; native syntax check failed" : ""}. See the linked logs above.`).join("\n") : "No language failures or blocked prerequisites were reported."}
${entries.some(({ report }) => report.unitTests !== "PASS") ? "\n- Shared tests failed; inspect the linked unit-test logs below.\n" : ""}
## Environments

| Language | Platform | Spin | Test completed | Shared tests |
| --- | --- | --- | --- | --- |
${environments.join("\n")}

## Installed Tool Inventory

| Language | Tool | Observed version |
| --- | --- | --- |
${versions.join("\n")}

## Scope And Limits

Results cover per-language builds and Spin HTTP checks, not Fermyon Cloud deployment certification or external services. Native syntax checks are not Wasm compilation or runtime tests. Ruby and PHP use provided Wasm interpreters. Tool inventories describe separate environments; a compiler absent from an unrelated language container is not a failure.
`;
}

export async function prepareReports(directory, languages) {
  await mkdir(directory, { recursive: true });
  await Promise.all(["local-test-results.md", "local-test-results.json"].map((filename) => rm(resolve(directory, filename), { force: true })));
  await Promise.all(languages.flatMap((language) => ["local-test-results.json", "local-test-results.md"].map((filename) =>
    rm(resolve(directory, language, filename), { force: true }))));
}

export async function combineReports(directory, languages) {
  const entries = [];
  for (const language of languages) {
    let report;
    try {
      report = JSON.parse(await readFile(resolve(directory, language, "local-test-results.json"), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
    assert.equal(report.results.length, 1, `Expected one result for ${language}`);
    assert.equal(report.results[0].component, language, `Unexpected component in ${language} report`);
    entries.push({ report, logPrefix: `${language}/local-test-logs` });
  }
  const filename = resolve(directory, "local-test-results.md");
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, renderReport(entries));
  await rename(temporary, filename);
  await Promise.all(languages.map((language) => rm(resolve(directory, language, "local-test-results.md"), { force: true })));
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const manifest = parse(await readFile(resolve(root, "spin.toml"), "utf8"));
  const languages = Object.keys(manifest.component);
  const directory = resolve(root, "reports");
  if (process.argv.includes("--prepare")) {
    await prepareReports(directory, languages);
  } else {
    assert.ok(await combineReports(directory, languages), "Some language reports are missing; run all languages first");
    console.log(`Report: ${resolve(directory, "local-test-results.md")}`);
  }
}