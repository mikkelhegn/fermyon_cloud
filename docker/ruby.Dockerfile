# syntax=docker/dockerfile:1
FROM lab-base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends perl ruby \
    && rm -rf /var/lib/apt/lists/*
USER tester
CMD ["--languages=ruby"]