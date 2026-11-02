# syntax=docker/dockerfile:1
FROM lab-base
USER root
ARG GRAIN_VERSION=0.7.2
RUN curl -fsSL --retry 3 "https://github.com/grain-lang/grain/releases/download/grain-v${GRAIN_VERSION}/grain-linux-x64" -o /usr/local/bin/grain \
    && chmod 755 /usr/local/bin/grain
USER tester
CMD ["--languages=grain"]