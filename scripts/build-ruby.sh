#!/bin/sh
set -eu
cd "$(dirname "$0")/../components/ruby"
if [ -f runtime/usr/local/bin/ruby ]; then exit 0; fi
mkdir -p build runtime
curl -fL --retry 3 -o build/ruby.tar.gz https://github.com/ruby/ruby.wasm/releases/download/2.10.1/ruby-4.0-wasm32-unknown-wasip1-minimal.tar.gz
expected=7df3dd3f72bbda49604d196cf662fed57f40d92daad5b995bf5bc7ab9dde249a
actual=$(shasum -a 256 build/ruby.tar.gz | cut -d ' ' -f 1)
if [ "$actual" != "$expected" ]; then echo "Ruby archive checksum mismatch" >&2; exit 1; fi
tar -xzf build/ruby.tar.gz --strip-components=1 -C runtime
test -f runtime/usr/local/bin/ruby