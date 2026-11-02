# Local Language Test Results

Generated: 2026-11-02T12:42:02.260Z

Environment: Linux x86_64; spin 4.2.5 (e09d7d5 2026-10-23); Node v22.20.0.

## Summary

1 languages checked: **0 passed**, **1 failed**, **0 blocked**.
Shared manifest and JavaScript handler tests: **PASS**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| F# | PASS | FAIL | NOT RUN | **FAIL** | Spin exited before readiness: code=1, signal=null ([build log](local-test-logs/fsharp-build.log)) |

## Follow-Up Actions

- Python: inspect the componentizer's signal-9 termination before claiming a successful build. Signal 9 establishes process termination, not its cause. Use Python 3.10+ as documented; compare the system and venv versions in the inventory below before retrying.
- Swift: install a WASI-capable SwiftWasm toolchain including `swift-autolink-extract`; the installed Apple Swift compiler is not a complete WASI build environment.
- Go: install Go and TinyGo, then resolve the Go module dependencies.
- C, C++, Zig: install the manifest-compatible Zig 0.13.0 compiler.
- C#, F#: install .NET 8 and the experimental WASI prerequisites; C# also requires Wizer.
- Grain: install a Grain compiler supporting the manifest's WASI build options.
- Rerun the complete matrix after installing prerequisites. A syntax-only PASS does not unblock a missing Wasm toolchain.

## Tool Inventory

| Tool | Observed version |
| --- | --- |
| cargo | Not installed |
| rustc | Not installed |
| node | v22.20.0 |
| npm | 10.9.3 |
| python3 | Python 3.10.12 |
| .venv/bin/python | Not installed |
| .venv/bin/componentize-py | Not installed |
| go | Not installed |
| tinygo | Not installed |
| zig | Not installed |
| dotnet | 8.0.415 |
| grain | Not installed |
| swiftc | Not installed |
| clang | Ubuntu clang version 14.0.0-1ubuntu1.1 Target: x86_64-pc-linux-gnu Thread model: posix InstalledDir: /usr/bin |
| ruby | Not installed |

## Method

- Run each available component build independently with `spin build -f spin.toml -c <component>`.
- Missing prerequisites are BLOCKED, not passes or application failures.
- Verify local build artifacts exist and have Wasm magic; PHP uses its manifest-pinned remote artifact instead.
- Ruby and PHP use prebuilt Wasm interpreters (PROVIDED), executing the packaged application sources during the HTTP tests; they are not local compiler builds.
- Start each built/provided component in an isolated Spin manifest on a temporary loopback port.
- Require HTTP 200, JSON content type, and the exact expected language from `GET /api/<component>`.
- For Rust, also require a greeting returned by the composed WIT dependency.
- Capture build, source, and runtime output in [local-test-logs](local-test-logs/).
- Stop every temporary server and remove temporary manifests after its test. Existing development servers are not modified.

Native syntax checks are not Wasm compilation or Spin runtime tests. A successful local Spin 4.2.5 test does not certify Fermyon Cloud compatibility.

## Scope And Limits

This run tests language compilation and HTTP handling, not Cloud deployment, AI model availability, external database credentials, Cloud quotas, or DNS. Python cross-language KV and the full Rust feature smoke suite are separate checks. No external service credentials are required or logged. A FAIL identifies an observed failure in this environment, not necessarily a language-source defect. See individual logs for root-cause evidence.

## Reproduce

`node scripts/test-all-languages.mjs`

For a single-language diagnostic: `node scripts/test-all-languages.mjs --languages=rust`. Each run replaces these summary files with the selected run's results.
