#!/bin/sh
# build-linkgrammar-wasm.sh — rebuild vendor/linkgrammar-wasm/ from
# Link Grammar 5.13.2 with Emscripten 3.1.56.
#
# Requires: an Emscripten SDK (emsdk) with emcc/em++ on PATH, GNU
# autotools (autoconf, automake, libtool, autoconf-archive macros),
# curl, and a C compiler for the build host. Produces
# vendor/linkgrammar-wasm/linkgrammar.{js,wasm} with the English
# dictionary embedded — no external files at runtime.
#
# Usage: sh scripts/build-linkgrammar-wasm.sh [workdir]
#   workdir defaults to a fresh mkdtemp under $TMPDIR.
#
# Recipe notes (Intel macOS, 2026-11-22):
# - Emscripten 3.1.56 is the newest SDK whose toolchain still ships
#   macOS x86_64 binaries; later SDKs are arm64-only.
# - emcc needs a config file with CACHE inside a writable dir when
#   $HOME is not writable: generate one with `emcc --generate-config`
#   under EM_CONFIG and set CACHE/LLVM_ROOT/BINARYEN_ROOT/NODE_JS.
# - The build disables pthreads (blank PTHREAD_CFLAGS/LIBS so the
#   module runs without SharedArrayBuffer: plain web pages, workers,
#   and Node), the SAT solver, sqlite, hunspell/aspell, editline,
#   and the Java/Python bindings; regex falls back to libc (-c).
# - HAVE_MALLOC_TRIM is undefined via CFLAGS: emscripten's malloc.h
#   does not declare malloc_trim().
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${1:-$(mktemp -d "${TMPDIR:-/tmp}/lg-wasm-build.XXXXXX")}"
LG_VERSION="${LG_VERSION:-5.13.2}"
DICT_SRC="${DICT_SRC:-/usr/local/share/link-grammar/en}"

mkdir -p "$WORK"
cd "$WORK"
echo "build dir: $WORK"

if [ ! -f link-grammar.tar.gz ]; then
  curl -fSL -o link-grammar.tar.gz \
    "https://github.com/opencog/link-grammar/archive/refs/tags/link-grammar-${LG_VERSION}.tar.gz"
fi
if [ ! -d src ]; then
  tar xzf link-grammar.tar.gz
  mv "link-grammar-link-grammar-${LG_VERSION}" src
fi
if [ ! -x src/configure ]; then
  (cd src && autoreconf --force --install)
fi
if [ ! -d stage/lgdict/en ]; then
  mkdir -p stage/lgdict
  cp -r "$DICT_SRC" stage/lgdict/en
fi

cd src
emconfigure ./configure \
  --disable-shared \
  --disable-java-bindings --disable-python-bindings \
  --disable-sat-solver --disable-aspell --disable-hunspell \
  --disable-editline --with-regexlib=c \
  'PTHREAD_CFLAGS= ' 'PTHREAD_LIBS= ' 'CFLAGS=-O2'
emmake make -C link-grammar -j4 'CFLAGS=-O2 -UHAVE_MALLOC_TRIM'
cd "$WORK"

mkdir -p "$WORK/out"
em++ -O2 -std=c++17 \
  -I"$WORK/src" \
  "$ROOT/scripts/lg-wasm-wrapper/wrapper.cpp" \
  "$WORK/src/link-grammar/.libs/liblink-grammar.a" \
  --bind \
  --embed-file "$WORK/stage/lgdict@/lgdict" \
  -sMODULARIZE=1 -sEXPORT_NAME=createLinkGrammar \
  -sENVIRONMENT=node,web -sALLOW_MEMORY_GROWTH=1 \
  -o "$WORK/out/linkgrammar.js"
# ESM glue for the browser bundle (loaded by URL + locateFile;
# same bytes, same embedded dictionary).
em++ -O2 -std=c++17 \
  -I"$WORK/src" \
  "$ROOT/scripts/lg-wasm-wrapper/wrapper.cpp" \
  "$WORK/src/link-grammar/.libs/liblink-grammar.a" \
  --bind \
  --embed-file "$WORK/stage/lgdict@/lgdict" \
  -sMODULARIZE=1 -sEXPORT_NAME=createLinkGrammar \
  -sENVIRONMENT=web,node -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORT_ES6=1 \
  -o "$WORK/out/linkgrammar-esm.js"

mkdir -p "$ROOT/vendor/linkgrammar-wasm"
cp "$WORK/out/linkgrammar.js" "$ROOT/vendor/linkgrammar-wasm/linkgrammar.js"
cp "$WORK/out/linkgrammar.wasm" "$ROOT/vendor/linkgrammar-wasm/linkgrammar.wasm"
cp "$WORK/out/linkgrammar-esm.js" "$ROOT/vendor/linkgrammar-wasm/linkgrammar-esm.js"
ls -la "$ROOT/vendor/linkgrammar-wasm"
