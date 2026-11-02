# syntax=docker/dockerfile:1
FROM lab-base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /workspace/.venv \
    && /workspace/.venv/bin/python -m pip install --no-cache-dir -r components/python/requirements.txt \
    && chown -R tester:tester /workspace/.venv
ENV PATH=/workspace/.venv/bin:$PATH
USER tester
CMD ["--languages=python"]