# syntax=docker/dockerfile:1
FROM lab-base
USER root
ARG GO_VERSION=1.23.6
ARG TINYGO_VERSION=0.35.0
ENV TINYGOROOT=/opt/tinygo \
    PATH=/opt/tinygo/bin:/opt/go/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL --retry 3 "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz \
    && tar -xzf /tmp/go.tar.gz -C /opt \
    && rm /tmp/go.tar.gz
RUN curl -fsSL --retry 3 "https://github.com/tinygo-org/tinygo/releases/download/v${TINYGO_VERSION}/tinygo${TINYGO_VERSION}.linux-amd64.tar.gz" -o /tmp/tinygo.tar.gz \
    && tar -xzf /tmp/tinygo.tar.gz -C /opt \
    && rm /tmp/tinygo.tar.gz
USER tester
RUN cd components/go && go mod tidy
CMD ["--languages=go"]