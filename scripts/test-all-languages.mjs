import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "smol-toml";
import { selectComponents } from "./select-components.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const reportDirectory = resolve(root, "reports");
const logDirectory = resolve(reportDirectory, "local-test-logs");
const manifest = parse(await readFile(resolve(root, "spin.toml"), "utf8"));
const selection = process.argv.find((argument) => argument.startsWith("--languages="));
const languages = selection ? selection.split("=", 2)[1].split(",") : Object.keys(manifest.component);
const buildTimeout = Number(process.env.LANGUAGE_BUILD_TIMEOUT_MS ?? 180000);
const startupTimeout = Number(process.env.LANGUAGE_STARTUP_TIMEOUT_MS ?? 90000);
assert.ok(Number.isSafeInteger(buildTimeout) && buildTimeout > 0, "Invalid LANGUAGE_BUILD_TIMEOUT_MS");
assert.ok(Number.isSafeInteger(startupTimeout) && startupTimeout > 0, "Invalid LANGUAGE_STARTUP_TIMEOUT_MS");
const expectedLanguages = {
  rust: "Rust", javascript: "JavaScript", typescript: "TypeScript", python: "Python",
  go: "Go", c: "C", cpp: "C++", csharp: "C#", fsharp: "F#", grain: "Grain",
  ruby: "Ruby", swift: "Swift", zig: "Zig", php: "PHP",
};
const prerequisites = {
  rust: ["cargo"], javascript: ["npm"], typescript: ["npm"],
  python: [resolve(root, ".venv/bin/componentize-py")], go: ["go", "tinygo"],
  c: ["zig"], cpp: ["zig"], csharp: ["dotnet"], fsharp: ["dotnet"],
  grain: ["grain"], ruby: ["curl", "tar", "shasum"], swift: ["swiftc"], zig: ["zig"], php: [],
};
const sourceCommands = {
  c: ["clang", ["-fsyntax-only", "-Wall", "-Wextra", "-Werror", "components/c/main.c"]],
  cpp: ["clang++", ["-fsyntax-only", "-Wall", "-Wextra", "-Werror", "components/cpp/main.cpp"]],
  python: ["python3", ["-m", "py_compile", "components/python/app.py"]],
  ruby: ["ruby", ["-c", "components/ruby/main.rb"]],
  swift: ["swiftc", ["-parse", "components/swift/main.swift"]],
};

function stop(child, signal = "SIGTERM") {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
}

async function execute(command, args, timeout = 180000) {
  return new Promise((fulfill) => {
    const child = spawn(command, args, { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let timedOut = false;
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { output += data; });
    const timer = setTimeout(() => { timedOut = true; stop(child, "SIGKILL"); }, timeout);
    child.once("error", (error) => {
      clearTimeout(timer);
      fulfill({ code: null, signal: null, output: output + error.message, timedOut });
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      fulfill({ code, signal, output, timedOut });
    });
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((fulfill, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", fulfill);
  });
  const port = server.address().port;
  await new Promise((fulfill, reject) => server.close((error) => error ? reject(error) : fulfill()));
  return port;
}

async function testRuntime(language) {
  const filename = resolve(root, `.spin-language-test-${language}.toml`);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let child;
  let output = "";
  await writeFile(filename, stringify(selectComponents(manifest, [language])));
  try {
    await new Promise((fulfill, reject) => {
      child = spawn("spin", ["up", "-f", filename, "--listen", `127.0.0.1:${port}`], {
        cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, SPIN_VARIABLE_API_TOKEN: randomUUID() },
      });
      const timer = setTimeout(() => reject(new Error(`Startup exceeded ${startupTimeout / 1000} seconds`)), startupTimeout);
      const capture = (data) => {
        output += data;
        if (output.includes(`Serving ${base}`)) { clearTimeout(timer); fulfill(); }
      };
      child.stdout.on("data", capture);
      child.stderr.on("data", capture);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (code, signal) => {
        clearTimeout(timer);
        reject(new Error(`Spin exited before readiness: code=${code}, signal=${signal}`));
      });
    });
    const response = await fetch(`${base}/api/${language}`, { signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    output += `\nGET /api/${language}\nHTTP ${response.status}\n${body}\n`;
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(JSON.parse(body).language, expectedLanguages[language]);
    if (language === "rust") assert.match(JSON.parse(body).composed_greeting, /composed component/);
    return { status: "PASS", detail: `HTTP 200; language=${expectedLanguages[language]}` };
  } catch (error) {
    output += `\nTEST ERROR: ${error.message}\n`;
    return { status: "FAIL", detail: error.message };
  } finally {
    if (child) {
      const closed = new Promise((fulfill) => child.once("close", fulfill));
      if (child.exitCode === null && child.signalCode === null) {
        stop(child, "SIGKILL");
        await closed;
      }
    }
    await writeFile(resolve(logDirectory, `${language}-runtime.log`), output);
    await unlink(filename);
  }
}

await mkdir(logDirectory, { recursive: true });
const platform = await execute("uname", ["-sm"]);
const spin = await execute("spin", ["--version"]);
const toolVersions = {};
for (const command of ["cargo", "rustc", "node", "npm", "python3", ".venv/bin/python", ".venv/bin/componentize-py", "go", "tinygo", "zig", "dotnet", "grain", "swiftc", "clang", "ruby"]) {
  const found = await execute("which", [command], 10000);
  toolVersions[command] = found.code === 0 ? (await execute(command, ["--version"], 10000)).output.trim() : "Not installed";
}
const suite = await execute("npm", ["test"]);
await writeFile(resolve(logDirectory, "unit-tests.log"), suite.output);
const results = [];

for (const language of languages) {
  assert.ok(manifest.component[language], `Unknown component: ${language}`);
  const row = { component: language, language: expectedLanguages[language], source: "NOT RUN", build: "NOT RUN", runtime: "NOT RUN", result: "BLOCKED", detail: "" };
  if (sourceCommands[language]) {
    const [command, args] = sourceCommands[language];
    const check = await execute(command, args, 60000);
    row.source = check.code === 0 ? "PASS" : "FAIL";
    await writeFile(resolve(logDirectory, `${language}-source.log`), check.output || `Exit code: ${check.code}\n`);
  }
  const missing = [];
  for (const command of prerequisites[language]) {
    if ((await execute("which", [command], 10000)).code !== 0) missing.push(command);
  }
  if (missing.length) {
    row.build = "BLOCKED";
    row.detail = `Missing prerequisites: ${missing.join(", ")}`;
    await writeFile(resolve(logDirectory, `${language}-build.log`), row.detail + "\n");
  } else {
    const build = await execute("spin", ["build", "-f", "spin.toml", "-c", language], buildTimeout);
    await writeFile(resolve(logDirectory, `${language}-build.log`), build.output + `\nExit code: ${build.code}; signal: ${build.signal}; timeout: ${build.timedOut}\n`);
    if (build.code !== 0) {
      row.build = "FAIL";
      row.result = "FAIL";
      const diagnostic = build.output.split(/\r?\n/).find((line) => /^(error:|Error: Build command)/.test(line));
      row.detail = build.timedOut ? `Build exceeded ${buildTimeout / 1000} seconds` : diagnostic ?? `Build exit=${build.code}, signal=${build.signal}; see build log`;
    } else {
      try {
        const source = manifest.component[language].source;
        if (typeof source === "string") {
          assert.ok((await stat(resolve(root, source))).size > 8, "Missing or empty Wasm artifact");
          assert.equal((await readFile(resolve(root, source))).subarray(0, 4).toString("hex"), "0061736d", "Artifact lacks Wasm magic");
        }
        row.build = typeof source === "string" && language !== "ruby" ? "PASS" : "PROVIDED";
        const runtime = await testRuntime(language);
        row.runtime = runtime.status;
        row.result = runtime.status;
        row.detail = runtime.detail;
      } catch (error) {
        row.build = "FAIL";
        row.result = "FAIL";
        row.detail = error.message;
      }
    }
  }
  results.push(row);
  console.log(`${row.language}: ${row.result} (${row.detail})`);
}

const report = {
  generatedAt: new Date().toISOString(), platform: platform.output.trim(), spin: spin.output.trim(),
  toolVersions, unitTests: suite.code === 0 ? "PASS" : "FAIL", results,
  totals: Object.fromEntries(["PASS", "FAIL", "BLOCKED"].map((status) => [status, results.filter((row) => row.result === status).length])),
};
await writeFile(resolve(reportDirectory, "local-test-results.json"), JSON.stringify(report, null, 2) + "\n");
const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const rows = results.map((row) => `| ${row.language} | ${row.build} | ${row.runtime} | ${row.source} | **${row.result}** | ${escape(row.detail)} ([build log](local-test-logs/${row.component}-build.log)) |`).join("\n");
const versionRows = Object.entries(toolVersions).map(([command, version]) => `| ${command} | ${escape(version)} |`).join("\n");
await writeFile(resolve(reportDirectory, "local-test-results.md"), `# Local Language Test Results

Generated: ${report.generatedAt}

Environment: ${report.platform}; ${report.spin}; Node ${process.version}.

## Summary

${results.length} languages checked: **${report.totals.PASS} passed**, **${report.totals.FAIL} failed**, **${report.totals.BLOCKED} blocked**.
Shared manifest and JavaScript handler tests: **${report.unitTests}**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
${rows}

## Follow-Up Actions

- Python: inspect the componentizer's signal-9 termination before claiming a successful build. Signal 9 establishes process termination, not its cause. Use Python 3.10+ as documented; compare the system and venv versions in the inventory below before retrying.
- Swift: install a WASI-capable SwiftWasm toolchain including \`swift-autolink-extract\`; the installed Apple Swift compiler is not a complete WASI build environment.
- Go: install Go and TinyGo, then resolve the Go module dependencies.
- C, C++, Zig: install the manifest-compatible Zig 0.13.0 compiler.
- C#, F#: install .NET 8 and the experimental WASI prerequisites; C# also requires Wizer.
- Grain: install a Grain compiler supporting the manifest's WASI build options.
- Rerun the complete matrix after installing prerequisites. A syntax-only PASS does not unblock a missing Wasm toolchain.

## Tool Inventory

| Tool | Observed version |
| --- | --- |
${versionRows}

## Method

- Run each available component build independently with \`spin build -f spin.toml -c <component>\`.
- Missing prerequisites are BLOCKED, not passes or application failures.
- Verify local build artifacts exist and have Wasm magic; PHP uses its manifest-pinned remote artifact instead.
- Ruby and PHP use prebuilt Wasm interpreters (PROVIDED), executing the packaged application sources during the HTTP tests; they are not local compiler builds.
- Start each built/provided component in an isolated Spin manifest on a temporary loopback port.
- Require HTTP 200, JSON content type, and the exact expected language from \`GET /api/<component>\`.
- For Rust, also require a greeting returned by the composed WIT dependency.
- Capture build, source, and runtime output in [local-test-logs](local-test-logs/).
- Stop every temporary server and remove temporary manifests after its test. Existing development servers are not modified.

Native syntax checks are not Wasm compilation or Spin runtime tests. A successful local Spin ${report.spin.split(" ")[1]} test does not certify Fermyon Cloud compatibility.

## Scope And Limits

This run tests language compilation and HTTP handling, not Cloud deployment, AI model availability, external database credentials, Cloud quotas, or DNS. Python cross-language KV and the full Rust feature smoke suite are separate checks. No external service credentials are required or logged. A FAIL identifies an observed failure in this environment, not necessarily a language-source defect. See individual logs for root-cause evidence.

## Reproduce

\`node scripts/test-all-languages.mjs\`

For a single-language diagnostic: \`node scripts/test-all-languages.mjs --languages=rust\`. Each run replaces these summary files with the selected run's results.
`);
console.log(`Report: reports/local-test-results.md (${report.totals.PASS} pass, ${report.totals.FAIL} fail, ${report.totals.BLOCKED} blocked)`);
process.exitCode = results.some((row) => row.result !== "PASS") || suite.code !== 0 ? 1 : 0;