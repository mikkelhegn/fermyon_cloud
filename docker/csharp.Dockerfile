# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:8.0.415-jammy AS dotnet
FROM lab-base
USER root
COPY --from=dotnet /usr/share/dotnet /usr/share/dotnet
ENV DOTNET_ROOT=/usr/share/dotnet \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_GCHeapHardLimit=0x20000000 \
    PATH=/usr/share/dotnet:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
    binaryen build-essential clang cmake libicu70 libssl3 lld llvm ninja-build python3 zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
ARG WIZER_VERSION=11.0.3
RUN mkdir -p /tmp/wizer \
    && curl -fsSL --retry 3 "https://github.com/bytecodealliance/wizer/releases/download/v${WIZER_VERSION}/wizer-v${WIZER_VERSION}-x86_64-linux.tar.xz" -o /tmp/wizer.tar.xz \
    && tar -xJf /tmp/wizer.tar.xz --strip-components=1 -C /tmp/wizer \
    && install /tmp/wizer/wizer /usr/local/bin/wizer \
    && rm -rf /tmp/wizer /tmp/wizer.tar.xz
USER tester
RUN dotnet restore components/csharp/Component.csproj --disable-parallel
CMD ["--languages=csharp"]