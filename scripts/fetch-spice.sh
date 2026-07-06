#!/usr/bin/env bash
# Fetch the ngspice WASM engine (built by ksalmon1/deepcircuits-ngspice-wasm)
# into public/models/. Required for circuit simulation and the E2E suite.
set -euo pipefail
BASE="https://raw.githubusercontent.com/ksalmon1/deepcircuits-ngspice-wasm/main/ngspice"
DEST="$(cd "$(dirname "$0")/.." && pwd)/public/models"
echo "Downloading spice.mjs and spice.wasm into $DEST ..."
curl -fsSL "$BASE/spice.mjs" -o "$DEST/spice.mjs"
curl -fsSL "$BASE/spice.wasm" -o "$DEST/spice.wasm"
echo "Done."
