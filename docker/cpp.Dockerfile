# syntax=docker/dockerfile:1
FROM lab-base
USER root
ARG ZIG_VERSION=0.13.0
ENV PATH=/opt/zig:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends clang \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/zig \
    && curl -fsSL --retry 3 "https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz" -o /tmp/zig.tar.xz \
    && tar -xJf /tmp/zig.tar.xz --strip-components=1 -C /opt/zig \
    && rm /tmp/zig.tar.xz
USER tester
CMD ["--languages=cpp"]