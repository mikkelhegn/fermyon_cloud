# Local Language Test Results

Generated: 2026-10-30T10:55:01.014Z

Environment: Darwin arm64; spin 4.2.5 (e09d7d5 2026-10-23); Node v26.12.1.

## Summary

14 languages checked: **5 passed**, **2 failed**, **7 blocked**.
Shared manifest and JavaScript handler tests: **PASS**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Rust | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=Rust ([build log](local-test-logs/rust-build.log)) |
| JavaScript | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=JavaScript ([build log](local-test-logs/javascript-build.log)) |
| TypeScript | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=TypeScript ([build log](local-test-logs/typescript-build.log)) |
| Python | FAIL | NOT RUN | PASS | **FAIL** | Error: Build command for component python failed with status Signaled(9) ([build log](local-test-logs/python-build.log)) |
| Go | BLOCKED | NOT RUN | NOT RUN | **BLOCKED** | Missing prerequisites: go, tinygo ([build log](local-test-logs/go-build.log)) |
| C | BLOCKED | NOT RUN | PASS | **BLOCKED** | Missing prerequisites: zig ([build log](local-test-logs/c-build.log)) |
| C++ | BLOCKED | NOT RUN | PASS | **BLOCKED** | Missing prerequisites: zig ([build log](local-test-logs/cpp-build.log)) |
| C# | BLOCKED | NOT RUN | NOT RUN | **BLOCKED** | Missing prerequisites: dotnet ([build log](local-test-logs/csharp-build.log)) |
| F# | BLOCKED | NOT RUN | NOT RUN | **BLOCKED** | Missing prerequisites: dotnet ([build log](local-test-logs/fsharp-build.log)) |
| Grain | BLOCKED | NOT RUN | NOT RUN | **BLOCKED** | Missing prerequisites: grain ([build log](local-test-logs/grain-build.log)) |
| Ruby | PASS | PASS | PASS | **PASS** | HTTP 200; language=Ruby ([build log](local-test-logs/ruby-build.log)) |
| Swift | FAIL | NOT RUN | PASS | **FAIL** | error: unableToFind(tool: "swift-autolink-extract") ([build log](local-test-logs/swift-build.log)) |
| Zig | BLOCKED | NOT RUN | NOT RUN | **BLOCKED** | Missing prerequisites: zig ([build log](local-test-logs/zig-build.log)) |
| PHP | PROVIDED | PASS | NOT RUN | **PASS** | HTTP 200; language=PHP ([build log](local-test-logs/php-build.log)) |

## Follow-Up Actions

- Python: inspect the componentizer's signal-9 termination before claiming a successful build. Signal 9 establishes process termination, not its cause. Recreate the venv with Python 3.10+ as documented; this machine's default Python and existing venv are 3.9.6, below the documented prerequisite.
- Swift: install a WASI-capable SwiftWasm toolchain including `swift-autolink-extract`; the installed Apple Swift compiler is not a complete WASI build environment.
- Go: install Go and TinyGo, then resolve the Go module dependencies.
- C, C++, Zig: install the manifest-compatible Zig 0.13.0 compiler.
- C#, F#: install .NET 8 and the experimental WASI prerequisites; C# also requires Wizer.
- Grain: install a Grain compiler supporting the manifest's WASI build options.
- Rerun the complete matrix after installing prerequisites. A syntax-only PASS does not unblock a missing Wasm toolchain.

## Tool Inventory

| Tool | Observed version |
| --- | --- |
| cargo | cargo 1.98.1 (797e8a9bc 2026-08-05) |
| rustc | rustc 1.98.1 (48a229cea 2026-09-01) |
| node | v26.12.1 |
| npm | 11.20.0 |
| python3 | Python 3.9.6 |
| .venv/bin/python | Python 3.9.6 |
| .venv/bin/componentize-py | componentize-py 0.17.2 |
| go | Not installed |
| tinygo | Not installed |
| zig | Not installed |
| dotnet | Not installed |
| grain | Not installed |
| swiftc | swift-driver version: 1.168.6 Apple Swift version 6.4 (swiftlang-6.4.0.34.1 clang-2100.3.34.1) Target: arm64-apple-macosx26.0 |
| clang | Homebrew clang version 23.1.4 Target: arm64-apple-darwin25.6.0 Thread model: posix InstalledDir: /opt/homebrew/Cellar/llvm/23.1.4/bin Configuration file: /opt/homebrew/Cellar/llvm/23.1.4/etc/clang/arm64-apple-darwin25.cfg |
| ruby | ruby 2.6.10p210 (2022-04-12 revision 67958) [universal.arm64e-darwin25] |

## Method

- Run each available component build independently with `spin build -f spin.toml -c <component>`.
- Missing prerequisites are BLOCKED, not passes or application failures.
- Verify local build artifacts exist and have Wasm magic; PHP uses its manifest-pinned remote artifact instead.
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
