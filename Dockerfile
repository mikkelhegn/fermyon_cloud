# syntax=docker/dockerfile:1
FROM ubuntu:22.04

ARG NODE_VERSION=22.20.0
ARG SPIN_VERSION=4.2.5
ARG TEST_UID=1000
ARG TEST_GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    LANGUAGE_BUILD_TIMEOUT_MS=900000 \
    LANGUAGE_STARTUP_TIMEOUT_MS=300000

RUN test "$(dpkg --print-architecture)" = amd64 || { echo "This image requires linux/amd64." >&2; exit 1; }
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl git unzip xz-utils \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL --retry 3 "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C /usr/local \
    && rm /tmp/node.tar.xz
RUN curl -fsSL --retry 3 "https://github.com/spinframework/spin/releases/download/v${SPIN_VERSION}/spin-v${SPIN_VERSION}-linux-amd64.tar.gz" -o /tmp/spin.tar.gz \
    && tar -xzf /tmp/spin.tar.gz -C /usr/local/bin spin \
    && rm /tmp/spin.tar.gz

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN groupadd --gid "$TEST_GID" tester \
    && useradd --uid "$TEST_UID" --gid "$TEST_GID" --create-home tester \
    && mkdir -p /workspace/reports /workspace/.spin \
    && chown -R tester:tester /workspace /home/tester
USER tester
ENV HOME=/home/tester
ENTRYPOINT ["node", "scripts/test-all-languages.mjs"]