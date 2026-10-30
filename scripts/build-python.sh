#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PATH="$root/.venv/bin:$PATH"
export PATH
cd "$(dirname "$0")/../components/python"
exec componentize-py -w spin-http componentize app -o app.wasm