# Fermyon Cloud Language Lab

A multi-component Spin application demonstrating Fermyon Cloud's documented
application APIs, with a separate HTTP component for each language explicitly
named in Spin's SDK guides, other-language guide, or official templates.

**Compatibility matters:** Fermyon Cloud does not publish an exhaustive,
versioned SDK certification matrix. This project targets the documented Spin 3 /
WASI Preview 1 and 2 interfaces, not Spin 4's Preview 3 templates. The pins below
are evidence-based compatibility selections, **not a claim that they are the
latest Cloud-certified releases**. A successful local Spin 4 build is not proof
that the Cloud host accepts every import. Validate against your Cloud account
before production use.

## Quick Start

Requires Spin 3.4+ (Spin 4 also works locally), current Rust with the
`wasm32-wasip1` and `wasm32-wasip2` targets, and Node.js 22+.

```sh
npm ci
rustup target add wasm32-wasip1 wasm32-wasip2
node scripts/select-components.mjs rust,javascript,typescript
spin build -f spin.local.toml
```

In fish, configure a local-only token and start the application:

```fish
set -gx SPIN_VARIABLE_API_TOKEN (openssl rand -hex 32)
spin up -f spin.local.toml --listen 127.0.0.1:3000
```

In another terminal, with the same token configured, run `npm run smoke`.
Set `LANGUAGES=rust,javascript,typescript` when testing this three-language
profile. The smoke test writes the fixed KV key `sample` and inserts a SQLite
note; use a test store/database, not production data.

For POSIX shells, use `export SPIN_VARIABLE_API_TOKEN=$(openssl rand -hex 32)`.
Do not use the test token in production. Without a token of at least 24
characters, protected operations fail closed with HTTP 503.

`GET /` and `GET /healthz` report application health. Each `GET /api/<language>`
returns JSON identifying its component. Rust's response also invokes a separate
WIT dependency, demonstrating **composition**, not HTTP service chaining.

## Language Components

| Route suffix | Language | SDK / toolchain | Status and scope |
| --- | --- | --- | --- |
| `rust` | Rust | `spin-sdk 5.2.0`, WASI P1 | Documented Spin 3 guide SDK; all feature endpoints |
| `javascript` | JavaScript | `@spinframework/wasi-http-proxy 2.0.0`, build-tools `2.1.3` | Current published HTTP package; WASI P2 |
| `typescript` | TypeScript | Same HTTP SDK, TypeScript `5.9.3` | Separate source and Wasm component; WASI P2 |
| `python` | Python | `spin-sdk 3.4.1`, componentize-py `0.17.2` | Official `http-py-p2` compatibility pins; shared KV read |
| `go` | Go / TinyGo | `spin-go-sdk/v2 2.2.1` | Latest v2 tag; TinyGo WASI P1 build |
| `c` | C | Zig `0.13.0`, libc | WAGI; no official language-specific Spin SDK |
| `cpp` | C++ | Zig `0.13.0`, libc++ | WAGI; exceptions disabled |
| `csharp` | C# | Fermyon.Spin.Sdk `0.1.0-alpha2`, Wasi.Sdk `0.1.1`, .NET 8 | Experimental official template pins |
| `fsharp` | F# | Wasi.Sdk `0.1.1`, .NET 8 | Experimental .NET WASI/WAGI; no F# Spin SDK |
| `grain` | Grain | Grain compiler with `--use-start-section` | WAGI; no Spin SDK |
| `ruby` | Ruby 4.0 | ruby.wasm `2.10.1`, WASI P1 minimal archive | WAGI; checksum-verified runtime download |
| `swift` | Swift | Modern SwiftWasm toolchain | WAGI; older SwiftWasm 5.10 is incompatible with Spin 3+ |
| `zig` | Zig | Zig `0.13.0` | WAGI; compiler pinned to this source API |
| `php` | PHP | Official Spin template's PHP-CGI `8.2.6` artifact | WAGI; older runtime, not recommended for production |

This is not a claim that Fermyon certifies all WASI languages or that all
languages have equal host-API access. WAGI handlers demonstrate HTTP execution;
they do not pretend to implement Spin SDK APIs. Other languages capable of
compiling to WASI may work, but are outside this explicit documentation-based
inventory. C# is included using its experimental SDK; F# uses the general WASI
path described in the other-language guide.

To include Python, install Python 3.10+ and create the project venv:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r components/python/requirements.txt
node scripts/select-components.mjs rust,javascript,typescript,python
spin build -f spin.local.toml
```

For Go, install Go and TinyGo, then run `go mod tidy` from the Go component
directory. For C, C++, and Zig, install **Zig 0.13.0**; newer Zig releases change
the standard I/O API. For .NET, install the .NET 8 SDK and the prerequisites in
the Spin .NET SDK repository, including Wizer for C#. For Grain and Swift,
install their WASI-capable compilers. The Ruby build downloads a pinned archive;
PHP is fetched by Spin with a manifest SHA-256 integrity check.

`spin build` builds the complete 14-language manifest. Only run it when all
toolchains are installed. `spin build -c rust` builds one component but does not
remove the other components from the runtime manifest. Use
`scripts/select-components.mjs` for a runnable subset.

**Package quota:** Cloud documents a 100 MB application package limit on the
standard plans. Ruby, Python, the two JS engines, and .NET can exceed that limit
together. The full language inventory may require a quota increase or multiple
deployments of selected profiles. Do not assume the full manifest fits a free
account. Keep only the language components you need for ordinary deployment.

## Feature API

All routes below are under `/api/rust` and require
`Authorization: Bearer <api_token>`. Responses use JSON. Input bodies are raw
UTF-8 text except the KV value, which accepts bytes. Inputs are capped at 64 KiB;
AI inputs are capped at 4096 bytes and inference outputs at 128 tokens.

| Method and suffix | Demonstration |
| --- | --- |
| `GET /kv` | Read managed KV key `sample` |
| `PUT /kv` | Persist key `sample` |
| `DELETE /kv` | Delete key `sample` |
| `GET /wasi-config` | Direct `wasi:config/store` draft lookup of `greeting` |
| `GET /wasi-keyvalue` | Direct `wasi:keyvalue/store` draft read of `sample` |
| `GET /sqlite` | Read the newest 20 persisted notes |
| `POST /sqlite` | Insert a note using a parameterized query |
| `GET /http` | Outbound HTTPS to a fixed allowlisted `example.com` URL |
| `POST /ai/infer` | Serverless AI, `llama2-chat` |
| `POST /ai/code` | Serverless AI, `codellama-instruct` |
| `POST /ai/embed` | Embeddings, `all-minilm-l6-v2` |
| `GET /redis` | Outbound Redis `PING` against your external service |
| `GET /mysql` | Outbound MySQL `SELECT 1` against your external database |
| `GET /postgres` | Outbound PostgreSQL `SELECT 1` against your external database |

`GET /api/python/kv` reads the same KV key from a different language and also
requires the token. This shares a resource, not a component's memory.

```sh
curl -H "Authorization: Bearer $SPIN_VARIABLE_API_TOKEN" \
  -X PUT --data-binary 'hello' http://127.0.0.1:3000/api/rust/kv
curl -H "Authorization: Bearer $SPIN_VARIABLE_API_TOKEN" \
  http://127.0.0.1:3000/api/rust/kv
```

External service URLs default to empty, returning 503 without attempting a
connection. Supply credentials using secret application variables `redis_url`,
`mysql_url`, and `postgres_url`. Set the corresponding **non-secret**
`redis_host`, `mysql_host`, and `postgres_host` variables to scheme/host/port only
for outbound permissions. Never put passwords in allowlists. Example: a secret
`mysql://user:password@db.example.com:3306/demo` needs
`mysql_host=mysql://db.example.com:3306`. Use TLS-capable provider connection
settings supported by Spin, restrict source access at your provider, and do not
send production credentials over unencrypted connections.

AI requires Cloud model availability and quotas. Local AI requires downloaded
models or a separately configured remote inference provider; the default local
runtime will not magically supply the models.

## Coverage And Boundaries

| Cloud feature | Implementation |
| --- | --- |
| HTTP triggers / multi-component routing | Separate routes in the manifest |
| Variables and encrypted Cloud secrets | Component-scoped configuration, token and external-service URLs |
| Managed KV / resource labels | `default` shared by Rust and Python |
| Managed SQLite / resource labels | Persistent notes, lazily initialized schema |
| Outbound HTTP, Redis, MySQL, PostgreSQL | Native host API calls, restricted allowlists |
| Serverless AI inference and embeddings | Three explicit, protected AI endpoints |
| Component dependencies | Local `lab:greeting/formatter@1.0.0` WIT dependency |
| Packaged files and environment | Ruby/PHP WAGI mounts and environment settings |
| Logs / request metrics | Structured stdout/stderr events; Cloud logs and dashboard |
| Deploy, upgrade, delete, CI/CD | Runbook below and manual-dispatch GitHub workflow |
| Custom domains / Fermyon subdomains / TLS | Account/DNS configuration described below |
| Cloud REST API / personal access tokens | Administrative integration, not exposed by this app |
| `wasi-config` / `wasi-keyvalue` draft interfaces | Direct bindings to the documented 2024-09-27 config and 2024-10-17 KV snapshots; read the same configuration and KV data |

Redis triggers, custom triggers, service chaining, blobstore, messaging, and
KV batch/atomics are intentionally absent because the Cloud support table does
not support them. MQTT is not listed as Cloud-supported there; it is not assumed
supported simply because a Spin SDK offers it. Local runtime-config files are
not uploaded as Cloud runtime configuration.

## Deploy And Operate

Deployment creates or updates resources in your account; it is not performed
automatically by this repository. Install/update the Cloud plugin and log in:

```sh
spin plugins update
spin plugins install cloud --yes
spin cloud login
spin cloud deploy --help
```

Build your selected profile and deploy using the existing environment variable:

```sh
spin cloud deploy -f spin.local.toml --variable api_token="$SPIN_VARIABLE_API_TOKEN"
```

The CLI prompts to provision or link the declared `default` KV store and SQLite
database. Link existing resources explicitly if necessary:

```sh
spin cloud link key-value --app cloud-language-lab --store YOUR_STORE default
spin cloud link sqlite --app cloud-language-lab --database YOUR_DATABASE default
spin cloud logs cloud-language-lab --follow
```

Change `greeting` through `spin cloud variables set greeting="Your greeting"
--app cloud-language-lab` to demonstrate dynamic configuration. Rotate
`api_token` through Cloud variables, never through a committed file. Updating a
secret may require clients to switch tokens immediately. CLI flag syntax can
change: consult the installed plugin's `--help` output.

Rebuild and run the same deploy command to upgrade. Cloud uses gradual rollout,
so old and new responses may coexist briefly. Use `BASE_URL` and `LANGUAGES` with
`npm run smoke` to validate the deployed profile. Enable `TEST_OUTBOUND=1`,
`TEST_EXTERNAL=1`, or `TEST_AI=1` only when intentionally testing those services.
On macOS's Node build, outbound fetches may need your network's proxy settings;
the application itself uses Spin host networking.

Assign a custom Fermyon subdomain or custom domain in the Cloud dashboard for
the application, follow its DNS verification/delegation instructions, and let
Cloud manage HTTPS. Do not delegate an apex domain without reviewing the
documented TXT/MX limitations. Request-count metrics are also in the dashboard;
the application does not implement a separate Cloud metrics exporter.

Cloud REST API and personal access tokens are control-plane features. Use the
published OpenAPI documentation and least-privilege tokens from an operator or
CI, not from publicly callable HTTP handlers. In GitHub, create a protected
`fermyon-cloud` environment with `FERMYON_CLOUD_TOKEN` and `DEMO_API_TOKEN`
secrets. The deploy workflow is manual, not triggered by untrusted pull requests.
It deploys the Rust/JS/TS profile. Review action dependencies and pin commit SHAs
according to your organization's supply-chain policy.

CI uses explicit `kv:default` and `sqlite:default` resource links so it cannot
block waiting for provisioning input. Set environment variables
`FERMYON_KV_STORE` and `FERMYON_SQLITE_DATABASE` in GitHub to existing Cloud
resource names, especially when your account already has its one SQLite
database. Otherwise it attempts to create resources named `cloud-language-lab`.

Delete only when intended: `spin cloud apps delete cloud-language-lab`. Linked
databases and KV stores have independent lifecycles; inspect links before
deleting resources. Never delete persistent resources merely to upgrade code.

## Verification

```sh
npm test
npm run build:typescript
spin build -f spin.local.toml
npm run smoke
```

During creation, Rust, the composed dependency, JavaScript, and TypeScript were
compiled locally. All five manifest/handler tests passed. HTTP smoke checks
passed against the running Wasm application for language routes, composition,
authentication, KV, SQLite, input limits, and both draft WASI interfaces. The
verified local profile is running at `http://127.0.0.1:3001`.
Python syntax was checked by
Pylance and its installed SDK inspected, but the local componentizer was killed
with signal 9 and produced no Wasm. Other language builds and Cloud deployment
have not been certified. C and C++ source syntax checks passed with local Clang.
AI and external databases require your own provider access and remain untested.

## Sources

- [Cloud documentation](https://developer.fermyon.com/cloud/index)
- [Cloud support matrix and quotas](https://developer.fermyon.com/cloud/faq)
- [Cloud plugin reference](https://developer.fermyon.com/cloud/cloud-command-reference)
- [Spin 3 SDK support](https://spinframework.dev/v3/language-support-overview)
- [Additional WASI languages](https://spinframework.dev/v3/other-languages)
- [Current Spin template compatibility warning](https://spinframework.dev/v4/writing-apps)
- [Python P2 template pins](https://github.com/spinframework/spin-python-sdk/tree/main/templates/http-py-p2)
- [JavaScript SDK packages](https://github.com/spinframework/spin-js-sdk/tree/main/packages)
- [Go SDK v2.2.1](https://github.com/spinframework/spin-go-sdk/tree/v2.2.1)
- [Experimental .NET template](https://github.com/spinframework/spin-dotnet-sdk/tree/main/templates/http-csharp)
- [Swift compatibility caveat](https://developer.fermyon.com/wasm-languages/swift)
- [Ruby WASI releases](https://github.com/ruby/ruby.wasm/releases/tag/2.10.1)

Compatibility research date: 2026-10-30. Cloud documentation contains historical
and conflicting statements (for example, KV-store count versus newer linking
support); this application uses only a single `default` label per resource.