# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:8.0.415-jammy

ARG TARGETARCH
ARG NODE_VERSION=22.20.0
ARG RUST_VERSION=1.90.0
ARG GO_VERSION=1.23.6
ARG TINYGO_VERSION=0.35.0
ARG ZIG_VERSION=0.13.0
ARG SPIN_VERSION=4.2.5
ARG GRAIN_VERSION=0.7.2
ARG SWIFTWASM_VERSION=6.0.2
ARG WIZER_VERSION=11.0.3
ARG TEST_UID=1000
ARG TEST_GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_GCHeapHardLimit=0x20000000 \
    LANGUAGE_BUILD_TIMEOUT_MS=900000 \
    LANGUAGE_STARTUP_TIMEOUT_MS=300000 \
    RUSTUP_HOME=/opt/rustup \
    TINYGOROOT=/opt/tinygo \
    PATH=/opt/swift/usr/bin:/opt/tinygo/bin:/opt/zig:/opt/go/bin:/opt/cargo/bin:/opt/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN test "$TARGETARCH" = amd64 || { echo "Build with --platform linux/amd64" >&2; exit 1; }
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash binaryen build-essential ca-certificates clang cmake curl git \
    libatomic1 libcurl4-openssl-dev libedit2 libicu70 libncurses5 libpython3.10 \
    libsqlite3-0 libtinfo5 libxml2 libz3-dev lld llvm ninja-build \
    debianutils perl pkg-config python3 python3-pip python3-venv ruby unzip wget \
    xz-utils zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL --retry 3 "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C /usr/local \
    && rm /tmp/node.tar.xz
RUN curl -fsSL --retry 3 https://sh.rustup.rs -o /tmp/rustup.sh \
    && CARGO_HOME=/opt/cargo sh /tmp/rustup.sh -y --profile minimal --default-toolchain "${RUST_VERSION}" --target wasm32-wasip1,wasm32-wasip2 \
    && rm /tmp/rustup.sh
RUN curl -fsSL --retry 3 "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz \
    && tar -xzf /tmp/go.tar.gz -C /opt \
    && rm /tmp/go.tar.gz
RUN curl -fsSL --retry 3 "https://github.com/tinygo-org/tinygo/releases/download/v${TINYGO_VERSION}/tinygo${TINYGO_VERSION}.linux-amd64.tar.gz" -o /tmp/tinygo.tar.gz \
    && tar -xzf /tmp/tinygo.tar.gz -C /opt \
    && rm /tmp/tinygo.tar.gz
RUN mkdir -p /opt/zig \
    && curl -fsSL --retry 3 "https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz" -o /tmp/zig.tar.xz \
    && tar -xJf /tmp/zig.tar.xz --strip-components=1 -C /opt/zig \
    && rm /tmp/zig.tar.xz
RUN curl -fsSL --retry 3 "https://github.com/spinframework/spin/releases/download/v${SPIN_VERSION}/spin-v${SPIN_VERSION}-linux-amd64.tar.gz" -o /tmp/spin.tar.gz \
    && tar -xzf /tmp/spin.tar.gz -C /usr/local/bin spin \
    && rm /tmp/spin.tar.gz
RUN curl -fsSL --retry 3 "https://github.com/grain-lang/grain/releases/download/grain-v${GRAIN_VERSION}/grain-linux-x64" -o /usr/local/bin/grain \
    && chmod 755 /usr/local/bin/grain
RUN mkdir -p /opt/swift \
    && curl -fsSL --retry 3 "https://github.com/swiftwasm/swift/releases/download/swift-wasm-${SWIFTWASM_VERSION}-RELEASE/swift-wasm-${SWIFTWASM_VERSION}-RELEASE-ubuntu22.04_x86_64.tar.gz" -o /tmp/swift.tar.gz \
    && tar -xzf /tmp/swift.tar.gz --strip-components=1 -C /opt/swift \
    && rm /tmp/swift.tar.gz \
    && test -x /opt/swift/usr/bin/swift-autolink-extract
RUN mkdir -p /tmp/wizer \
    && curl -fsSL --retry 3 "https://github.com/bytecodealliance/wizer/releases/download/v${WIZER_VERSION}/wizer-v${WIZER_VERSION}-x86_64-linux.tar.xz" -o /tmp/wizer.tar.xz \
    && tar -xJf /tmp/wizer.tar.xz --strip-components=1 -C /tmp/wizer \
    && install /tmp/wizer/wizer /usr/local/bin/wizer \
    && rm -rf /tmp/wizer /tmp/wizer.tar.xz

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY components/python/requirements.txt /tmp/python-requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/python -m pip install --no-cache-dir -r /tmp/python-requirements.txt \
    && rm /tmp/python-requirements.txt
COPY . .
RUN ln -s /opt/venv .venv \
    && cd components/go && go mod tidy
RUN dotnet restore components/csharp/Component.csproj --disable-parallel \
    && dotnet restore components/fsharp/Component.fsproj --disable-parallel
RUN sh scripts/build-ruby.sh \
    && swiftc -target wasm32-unknown-wasi -Osize components/swift/main.swift -o /tmp/swift-probe.wasm \
    && rm /tmp/swift-probe.wasm
RUN spin --version && cargo --version && go version && tinygo version \
    && zig version && grain --version && wizer --version && dotnet --version

RUN groupadd --gid "$TEST_GID" tester \
    && useradd --uid "$TEST_UID" --gid "$TEST_GID" --create-home tester \
    && mkdir -p /workspace/reports /home/tester/.nuget \
    && cp -a /root/.nuget/packages /home/tester/.nuget/ \
    && chown -R tester:tester /workspace /home/tester \
    && chmod -R a+rX /opt/rustup /opt/cargo
USER tester
ENV HOME=/home/tester
ENTRYPOINT ["node", "scripts/test-all-languages.mjs"]