# syntax=docker/dockerfile:1
FROM lab-base
USER root
ARG RUST_VERSION=1.90.0
ENV RUSTUP_HOME=/opt/rustup \
    PATH=/opt/cargo/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL --retry 3 https://sh.rustup.rs -o /tmp/rustup.sh \
    && CARGO_HOME=/opt/cargo sh /tmp/rustup.sh -y --profile minimal --default-toolchain "${RUST_VERSION}" --target wasm32-wasip1,wasm32-wasip2 \
    && rm /tmp/rustup.sh \
    && chmod -R a+rX /opt/rustup /opt/cargo
USER tester
CMD ["--languages=rust"]