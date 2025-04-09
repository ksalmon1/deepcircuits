#!/bin/bash

# Exit on error
set -e

# --- Configuration ---
NGSPICE_REPO_URL="git://git.code.sf.net/p/ngspice/ngspice"
NGSPICE_BRANCH="minimal-ngspice" # Specify the branch to use
NGSPICE_CLONE_DIR="ngspice_source" # Directory to clone source into
NGSPICE_SRC_DIR=$(pwd)/$NGSPICE_CLONE_DIR # Use the cloned source directory
BUILD_DIR=$(pwd)/build_output # Build output directory relative to current path
NPROC=$(nproc)           # Number of processors for parallel make

# --- Activate Emscripten & Check --- 
source /opt/emsdk/emsdk_env.sh
echo "--- Emscripten Environment Check ---"
echo "PATH: $PATH"
echo "Which emconfigure: $(which emconfigure || echo 'emconfigure not found')"
echo "----------------------------------"


# --- Clone/Update ngspice source ---
if [ ! -d "$NGSPICE_CLONE_DIR" ]; then
    echo "Cloning ngspice source from $NGSPICE_REPO_URL, branch $NGSPICE_BRANCH into $NGSPICE_CLONE_DIR..."
    git clone --depth 1 --branch $NGSPICE_BRANCH $NGSPICE_REPO_URL $NGSPICE_CLONE_DIR
else
    echo "ngspice source directory '$NGSPICE_CLONE_DIR' already exists."
    # Optional: Add logic here if you want to ensure it's the correct branch or update
    echo "Assuming existing directory contains the correct branch ($NGSPICE_BRANCH)."
fi

# --- Prepare Source (Patches & Autogen) ---
echo "Preparing ngspice source (branch: $NGSPICE_BRANCH)..."
cd $NGSPICE_CLONE_DIR
# Apply patches (if any are needed for minimal-ngspice branch - check configure.ac, etc.)
# sed -i 's/-Wno-unused-but-set-variable/-Wno-unused-const-variable/g' ./configure.ac
# sed -i 's/AC_CHECK_FUNCS(\[time getrusage\])/AC_CHECK_FUNCS(\[time\])/g' ./configure.ac
# sed -i 's|#include "ngspice/ngspice.h"|#include <emscripten.h>\n\n#include "ngspice/ngspice.h"|g' ./src/frontend/control.c
# sed -i 's|freewl = wlist = getcommand(string);|/* emscripten_sleep(100); */\n\n\t\tfreewl = wlist = getcommand(string);|g' ./src/frontend/control.c

# Generate configure script
./autogen.sh

# Patch bool.h conflict
BOOL_H_PATH="./src/include/ngspice/bool.h"
if [ -f "$BOOL_H_PATH" ]; then
    echo "Patching $BOOL_H_PATH to fix bool redefinition (making conditional)..."
    # sed -i 's|^typedef int bool;.*|/* & */|' "$BOOL_H_PATH" # Remove previous comment-out patch
    # Make the typedef conditional: only define if 'bool' is not already defined
    # by C++ or stdbool.h
    sed -i '/typedef int bool;/i #if !defined(bool) && !defined(__cplusplus)' "$BOOL_H_PATH"
    sed -i '/typedef int bool;/a #endif' "$BOOL_H_PATH"
    echo "Patching done."
else
    echo "Warning: $BOOL_H_PATH not found, skipping bool patch (may not be needed for this branch)."
fi
cd .. # Go back to the parent directory (e.g., ~/ngspice)


# --- Ensure Build Directory Exists ---
mkdir -p $BUILD_DIR
cd $BUILD_DIR

# --- Clean previous build (optional but recommended) ---
echo "Cleaning previous build artifacts..."
rm -rf release
mkdir release

# --- Configure ngspice ---
echo "Configuring ngspice..."
cd release
# Configure for static library build (--enable-static), disable unnecessary features
emconfigure $NGSPICE_SRC_DIR/configure \
    --prefix=$BUILD_DIR/install \
    --enable-static \
    --disable-shared \
    --disable-debug \
    --disable-x \
    --disable-readline \
    --with-readline=no \
    --with-editline=no \
    --disable-xspice \
    --disable-cider \
    # Add/remove flags based on minimal-ngspice branch needs
    # For example, OpenMP might not be supported or desired:
    # --disable-openmp \
    CFLAGS="-O3 -fPIC" \
    LDFLAGS="-L$BUILD_DIR/release/src/.libs" \
    EMSCRIPTEN=1

# --- Build ngspice library ---
echo "Building ngspice library (make)..."
# Explicitly target the library instead of default 'all'
emmake make -j${NPROC} src/libngspice.la

# --- Check if libngspice.a was created ---
LIB_PATH="src/.libs/libngspice.a" # Check for the static library
if [ ! -f "$LIB_PATH" ]; then
    echo "Error: Static library $LIB_PATH not found after make."
    exit 1
fi
echo "Static library $LIB_PATH found."

# --- Inspect Symbols (Optional Debugging - COMMENTED OUT) ---
# echo "Attempting to inspect symbols (optional step)..."
# # Attempt to find the shared object file associated with the .la file
# SO_LIB_PATH_GUESS=$(echo $LIB_PATH | sed 's/\.la$/.so/')
# if [ -f "$SO_LIB_PATH_GUESS" ]; then
#     SO_LIB_PATH="$SO_LIB_PATH_GUESS"
# else
#     # If .so doesn't exist, try to extract from .la file
#     SO_LIB_PATH_FROM_LA=$(grep -o "dlname='[^']*'" $LIB_PATH | cut -d"\'" -f2)
#     if [ -f "src/.libs/$SO_LIB_PATH_FROM_LA" ]; then
#         SO_LIB_PATH="src/.libs/$SO_LIB_PATH_FROM_LA"
#     else
#         SO_LIB_PATH="" # Clear if not found
#     fi
# fi
# 
# if [ -n "$SO_LIB_PATH" ] && [ -f "$SO_LIB_PATH" ]; then
#     echo "Inspecting symbols in $SO_LIB_PATH..."
#     llvm-nm -g "$SO_LIB_PATH" > $BUILD_DIR/symbol_check.log || echo "llvm-nm failed, continuing..."
#     if [ -f "$BUILD_DIR/symbol_check.log" ]; then
#         echo "--- Symbol Inspection Log ($BUILD_DIR/symbol_check.log) ---"
#         cat $BUILD_DIR/symbol_check.log
#         echo "--- End of Symbol Inspection ---"
#     fi
# else
#      echo "Warning: Could not find shared library (.so) to inspect symbols."
# fi

# --- Link into final WASM/JS ---
echo "Linking final spice.js and spice.wasm..."
emcc -O3 \
    src/.libs/libngspice.a \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="'SpiceModule'" \
    -s ENVIRONMENT='web,worker' \
    -s EXPORT_ES6=1 \
    -s EXPORTED_RUNTIME_METHODS='["cwrap", "ccall", "FS"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=256MB \
    -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_ngSpice_Init", "_ngSpice_Command", "_ngSpice_Circ", "_ngSpice_AllPlots", "_ngSpice_AllVecs", "_ngSpice_CurPlot", "_ngSpice_running", "_ngSpice_Reset"]' \
    -o $BUILD_DIR/spice.js

# --- Verify output ---
if [ -f "$BUILD_DIR/spice.js" ] && [ -f "$BUILD_DIR/spice.wasm" ]; then
    echo "Successfully built $BUILD_DIR/spice.js and $BUILD_DIR/spice.wasm"
    ls -l $BUILD_DIR/spice.*
else
    echo "Error: Failed to create spice.js/spice.wasm"
    exit 1
fi

echo "Build complete." 