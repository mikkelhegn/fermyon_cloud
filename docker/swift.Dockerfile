# syntax=docker/dockerfile:1
FROM lab-base
USER root
ARG SWIFTWASM_VERSION=6.0.2
ARG SWIFTWASM_SDK_SHA256=6ffedb055cb9956395d9f435d03d53ebe9f6a8d45106b979d1b7f53358e1dcb4
ENV SWIFT_WASI_SDK_ROOT=/opt/swift-wasi/swift-wasm-${SWIFTWASM_VERSION}-RELEASE-wasm32-unknown-wasi.artifactbundle/${SWIFTWASM_VERSION}-RELEASE-wasm32-unknown-wasi/wasm32-unknown-wasi \
    PATH=/opt/swift/usr/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
    libatomic1 libcurl4-openssl-dev libedit2 libicu70 libncurses5 libpython3.10 \
    libsqlite3-0 libtinfo5 libxml2 libz3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/swift \
    && curl -fsSL --retry 3 "https://github.com/swiftwasm/swift/releases/download/swift-wasm-${SWIFTWASM_VERSION}-RELEASE/swift-wasm-${SWIFTWASM_VERSION}-RELEASE-ubuntu22.04_x86_64.tar.gz" -o /tmp/swift.tar.gz \
    && tar -xzf /tmp/swift.tar.gz --strip-components=1 -C /opt/swift \
    && rm /tmp/swift.tar.gz \
    && test -x /opt/swift/usr/bin/swift-autolink-extract
RUN mkdir -p /opt/swift-wasi \
    && curl -fsSL --retry 3 "https://github.com/swiftwasm/swift/releases/download/swift-wasm-${SWIFTWASM_VERSION}-RELEASE/swift-wasm-${SWIFTWASM_VERSION}-RELEASE-wasm32-unknown-wasi.artifactbundle.zip" -o /tmp/swift-wasi.zip \
    && printf '%s  %s\n' "$SWIFTWASM_SDK_SHA256" /tmp/swift-wasi.zip | sha256sum -c - \
    && unzip -q /tmp/swift-wasi.zip -d /opt/swift-wasi \
    && rm /tmp/swift-wasi.zip \
    && test -f "$SWIFT_WASI_SDK_ROOT/swift.xctoolchain/usr/lib/swift_static/wasi/static-executable-args.lnk" \
    && test -d "$SWIFT_WASI_SDK_ROOT/WASI.sdk"
USER tester
RUN sh scripts/build-swift.sh /tmp/swift-probe.wasm && rm /tmp/swift-probe.wasm
CMD ["--languages=swift"]