# Containerized Language Tests

The 14-component Spin app has 13 language test Dockerfiles under `docker/` and
matching services in `compose.yaml`. F# remains in `spin.toml` but is excluded
from the automated Spin matrix. Its module runs directly under Wasmtime 50.0.1,
but Spin 4.2.5 traps in the WAGI Preview 1 adapter during `allocate_stack`.
The root `Dockerfile` supplies shared Ubuntu 22.04, Node.js, Spin, and npm
dependencies. Language images install their own toolchains.
These are one-shot build/test services, not persistent application servers.

## Build And Run

Use Docker Compose 2.17+ with BuildKit (required for `additional_contexts`):

```sh
mkdir -p reports
docker compose build
docker compose up
docker compose ps -a
```

Compose builds `base` before dependent language images. The base service
initializes the Node dependency volume, clears previous generated summaries,
and exits successfully; each tested language then runs the shared unit tests,
its own build, and an isolated Spin HTTP test.
Services run concurrently and stop after testing. No ports or credentials are
needed.

After all 13 tested language JSON results are written, the last finishing service
creates one combined Markdown report at `reports/local-test-results.md`, even
when tests fail. Language containers do not create individual Markdown reports.
If a container crashes before writing its JSON, the combined report is not
created; inspect `docker compose ps -a` and container output for the missing run.

The full local matrix also runs in GitHub Actions through the **Local Language
Matrix** workflow. It runs weekly and can be started manually from the Actions
tab. Its `local-language-matrix` artifact contains the combined report and
per-language logs; the job fails if any language or the report gate fails.
Provider-dependent Cloud checks are separate and are not part of this local
matrix.

To build and test just one language, with a meaningful test exit code:

```sh
docker compose build python
docker compose up --exit-code-from python python
```

For a subset, use `docker compose build rust javascript typescript` followed by
`docker compose up rust javascript typescript`.
Plain `docker compose up` is not an aggregate test exit code: inspect
`docker compose ps -a` and the combined report. Each language exits 0 only
when its shared tests and language checks pass; exit 1 means failure or blocked
prerequisites. Use `--exit-code-from` only for single-language runs, because it
stops other containers when a service exits.

For a diagnostic shell after building the chosen image:

```sh
docker compose run --rm --entrypoint bash python
```

## Shared Filesystem

- Every language bind-mounts the repository at `/workspace`. Source edits are
  immediately visible; built Wasm artifacts are shared and appear on the host.
  Rebuild images for toolchain or dependency changes, not ordinary source edits.
- The shared `node-dependencies` volume overlays `/workspace/node_modules`,
  hiding host dependencies and preserving Linux npm packages from the image.
  Language services mount this volume read-only.
- Python mounts `python-environment` at `/workspace/.venv`, hiding host virtualenvs
  and preserving the image's Python 3.10 environment.
- Each service has a private anonymous `/workspace/.spin` volume so databases and
  logs do not collide between services or modify host Spin state.
- JSON results and logs remain isolated under `reports/<language>/` as
  `local-test-results.json` and `local-test-logs/`. Only the combined Markdown
  report is written at `reports/local-test-results.md`, with links into those
  log directories and follow-up actions based on actual failures.
- Spin component stdout/stderr is captured under
  `reports/<language>/local-test-logs/<language>-component-logs/` and appended to
  the corresponding runtime log, including when a request fails.
- The base service removes old summary JSON and Markdown files at the start of
  each invocation, including legacy per-language Markdown reports and stale F# results. Existing
  logs are retained. Run the entire matrix to generate the combined report;
  selected-language invocations produce only their JSON results and logs.
- To regenerate the combined Markdown from an existing complete set of results,
  run `docker compose run --rm --no-deps --entrypoint node javascript scripts/language-reports.mjs`.
  `--no-deps` prevents the base preparation step from clearing those results.
- Direct host runs still write JSON and Markdown to `reports/`; the runner
  accepts `LANGUAGE_REPORT_DIRECTORY` to override this.

Named dependency volumes are seeded on first use, not refreshed on rebuild.
After changing npm dependencies or Python requirements, recreate them:

```sh
docker compose down --volumes
docker compose build
docker compose up
```

This removes container dependency volumes and private Spin state, not the shared
repository, generated Wasm artifacts, or reports. Do not run two instances of
the same language service or host builds against this tree simultaneously: they
would write the same build outputs and reports. Compiler outputs are shared
with the host; clean a language's generated outputs when switching between host
and Linux toolchains if necessary.

## Permissions And Resources

Images run as non-root `tester` (UID/GID 1000 by default). On Linux the repository
and reports must be writable by that user. Set host IDs before building/running:

```sh
export TEST_UID="$(id -u)" TEST_GID="$(id -g)"
docker compose build
docker compose up
```

In fish, use `set -gx TEST_UID (id -u)` and `set -gx TEST_GID (id -g)`.
Recreate dependency volumes if changing IDs after initialization.

All images target `linux/amd64`; Apple Silicon requires emulation. Swift and .NET
remain large. Allow several GB of disk and at least 8 GB of Docker VM RAM for
the full matrix. On smaller VMs build serially using
`docker compose --parallel 1 build` and test one language at a time.
.NET retains the 512 MiB GC heap cap and sequential NuGet restore.

Timeouts default to 15 minutes per build and 5 minutes per startup. Override
`LANGUAGE_BUILD_TIMEOUT_MS` and `LANGUAGE_STARTUP_TIMEOUT_MS` in your shell or a
local `.env` file; Compose forwards them to every language service.

## Toolchain Pins

| Tool | Version |
| --- | --- |
| Node.js / Spin (shared) | 22.20.0 / 4.2.5 |
| Rust | 1.90.0, WASI P1 and P2 targets |
| Go / TinyGo | 1.23.6 / 0.35.0 |
| Zig (C, C++, Zig) | 0.13.0 |
| .NET SDK (C#) | 8.0.415, Ubuntu Jammy |
| Grain | 0.7.2 |
| SwiftWasm | 6.0.2, complete Ubuntu 22.04 toolchain and WASI SDK |
| Python SDK / componentizer | Existing requirements: 3.4.1 / 0.17.2 |
| Ruby / PHP Wasm runtimes | Existing script and manifest pins |

Compiler versions remain build arguments in each Dockerfile. Configure overrides
in the service's Compose `build.args`; shared Node/Spin overrides belong to `base`.
The normal local matrix uses Spin 4.2.5. The manual Cloud comparison workflow
sets `SPIN_VERSION=3.4.1` for the Linux language images to match its Cloud target.
Ruby downloads and integrity-checks its runtime on its first test; PHP downloads
its manifest-pinned runtime through Spin. Rust and experimental WASI builds may
also download dependencies, so this is not an offline setup.

## Validation Scope

Configuration and unit checks do not prove every compiler image builds or every
tested language passes its runtime test. The 13-language matrix requires adequate
VM RAM, reachable registries, and successful per-language reports. F#'s .NET WASI
binary runs directly under Wasmtime 50.0.1, but Spin 4.2.5 traps in the WAGI
Preview 1 adapter during `allocate_stack`; it is excluded pending a compatible
Spin component runtime. These are local Spin tests, not Fermyon Cloud deployment
certification or external service checks.