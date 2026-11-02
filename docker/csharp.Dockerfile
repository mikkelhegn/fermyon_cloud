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
USER tester
RUN dotnet restore components/csharp/Component.csproj --disable-parallel
CMD ["--languages=csharp"]