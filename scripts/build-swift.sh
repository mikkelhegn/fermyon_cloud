#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
output=${1:-components/swift/app.wasm}
if [ -n "${SWIFT_WASI_SDK_ROOT:-}" ]; then
    resources="$SWIFT_WASI_SDK_ROOT/swift.xctoolchain/usr/lib/swift_static"
    test -f "$resources/wasi/static-executable-args.lnk"
    test -d "$SWIFT_WASI_SDK_ROOT/WASI.sdk"
    exec swiftc -target wasm32-unknown-wasi -Osize -static-stdlib \
        -sdk "$SWIFT_WASI_SDK_ROOT/WASI.sdk" -resource-dir "$resources" \
        components/swift/main.swift -o "$output"
fi
exec swiftc -target wasm32-unknown-wasi -Osize components/swift/main.swift -o "$output"