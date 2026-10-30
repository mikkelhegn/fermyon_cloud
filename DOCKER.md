# Containerized Language Tests

The Dockerfile installs the prerequisites for all 14 components in an Ubuntu
22.04 / Linux amd64 test environment. It uses Python 3.10 instead of macOS's
Python 3.9, a full SwiftWasm compiler including `swift-autolink-extract`, and
the experimental .NET 8 WASI build dependencies.

## Build And Run

From the repository root:

```sh
docker build --platform linux/amd64 -t cloud-language-lab-tests .
mkdir -p reports
docker run --rm --init --platform linux/amd64 \
  --mount type=bind,source="$PWD/reports",target=/workspace/reports \
  cloud-language-lab-tests
```

Only reports are mounted from the host. Do not mount the entire workspace over
`/workspace`: doing so would hide the Linux npm dependencies, Python environment,
and other dependencies prepared in the image. Source changes require rebuilding
the image; Docker reuses unchanged toolchain and dependency layers.

The reports appear in `reports/local-test-results.md`,
`reports/local-test-results.json`, and `reports/local-test-logs/` on the host.
Exit code 0 means every selected language and the shared tests passed. Exit code
1 means at least one test failed or was blocked; reports are still written.
No ports need to be published. Every HTTP test uses a temporary loopback port
inside the container, and its temporary server is stopped afterward.

To test one component:

```sh
docker run --rm --init --platform linux/amd64 \
  --mount type=bind,source="$PWD/reports",target=/workspace/reports \
  cloud-language-lab-tests --languages=python
```

Each invocation replaces the summary reports with that run's selection.

For an interactive diagnostic shell:

```sh
docker run --rm -it --platform linux/amd64 --entrypoint bash cloud-language-lab-tests
```

The image runs as the non-root `tester` user (UID/GID 1000 by default). On Linux,
make the reports directory writable by that user or set `TEST_UID` and `TEST_GID`
at build time to your host user's IDs. For example, in a POSIX shell:

```sh
docker build --platform linux/amd64 \
  --build-arg TEST_UID="$(id -u)" --build-arg TEST_GID="$(id -g)" \
  -t cloud-language-lab-tests .
```

In fish, command substitutions use `(id -u)` and `(id -g)` instead of `$()`.

## Toolchain Pins

| Tool | Version |
| --- | --- |
| .NET SDK | 8.0.415, Ubuntu Jammy image |
| Node.js | 22.20.0 |
| Rust | 1.90.0 with WASI P1 and P2 targets |
| Go / TinyGo | 1.23.6 / 0.35.0 |
| Zig | 0.13.0 for C, C++, and Zig |
| Spin | 4.2.5 |
| Grain | 0.7.2 |
| SwiftWasm | 6.0.2, complete Ubuntu 22.04 toolchain |
| Wizer | 11.0.3 |
| Python SDK / componentizer | Existing requirements: 3.4.1 / 0.17.2 |
| C# / F# WASI dependencies | Existing project package pins |
| Ruby / PHP Wasm runtimes | Existing manifest and download-script pins |

Compiler versions are Docker build arguments; changing one does not change the
application's SDK pins. Ruby's runtime and NuGet packages are prepared during
image build. PHP is downloaded and integrity-checked by Spin when its test starts.
Initial test runs may also download Rust crates and experimental WASI support
artifacts, so this is not an offline image.

## Limits

- Apple Silicon requires amd64 emulation because of the experimental toolchain
  binary choices. Native Linux amd64 is recommended for speed and reliability.
- The image is large, primarily because it includes Swift, .NET, LLVM, and Rust.
  Allow several GB of disk and sufficient Docker Desktop memory for compiler
  processes. Emulated builds can take considerably longer than native builds.
- The image caps the .NET GC heap at 512 MiB and restores NuGet packages
  sequentially. This reduces memory pressure but is not a substitute for enough
  Docker VM RAM. The local 2 GB Colima VM hit an allocation failure during the
  initial uncapped restore; allocate at least 8 GB for the full compiler matrix.
- Container builds allow 15 minutes per language and 5 minutes per server startup.
  Override `LANGUAGE_BUILD_TIMEOUT_MS` or `LANGUAGE_STARTUP_TIMEOUT_MS` with
  `docker run -e` if needed. Local non-container defaults remain 180 and 90 seconds.
- The image supplies prerequisites; it does not turn experimental SDKs into
  supported releases or guarantee every application component passes.
- These are local Spin tests, not Fermyon Cloud deployment certification. No
  Cloud credentials, database passwords, or AI provider access are needed.

## Validation Status

The initial `docker build --check` passed with no warnings. A full build then
successfully installed the system packages, Node, Rust, Go, TinyGo, Zig, Spin,
Grain, SwiftWasm, Wizer, npm dependencies, Python SDK, and Go module dependencies.
It stopped at .NET restore with `cannot allocate memory` in the local 2 GB
ARM64 Colima VM under amd64 emulation.

A .NET startup probe with the new 512 MiB GC cap passed, but that does not prove
restore or the complete build will succeed. Validation of the revised image was
subsequently blocked by Docker Hub authentication routing (`no route to host`).
The complete image and container test matrix therefore remain unverified.
The local runner syntax check and all five existing project tests passed.

Retry the build on a reachable registry connection and a VM with adequate RAM,
then run the matrix using the commands above. There is no container-generated
all-language pass report yet.