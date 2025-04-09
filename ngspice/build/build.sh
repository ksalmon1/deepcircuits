# --- Configuration ---
# ... (other config variables)

# Functions to export from C to JS (prefix with underscore)
# Add _cwrap and _ccall for JS<->WASM interaction
EXPORTED_FUNCTIONS="['_main', '_ngSpice_Init', '_ngSpice_Command', '_cwrap', '_ccall']"
# Add runtime methods needed by JS code (no underscore needed unless function name starts with one)
EXPORTED_RUNTIME_METHODS="['FS', 'cwrap', 'ccall']" # Ensure FS and cwrap/ccall are available at runtime

# ... (rest of the script: cleanup, configure, make) ...

# --- Link C library and Emscripten runtime into final JS/WASM ---
echo "Linking final spice.js and spice.wasm..."
emcc \\
    ${LIBRARY_PATH} \\
    -o ${OUTPUT_DIR}/spice.js \\
    -s WASM=1 \\
    -s MODULARIZE=1 \\
    -s EXPORT_ES6=1 \\
    -s USE_ES6_IMPORT_META=0 \\
    -s EXPORTED_FUNCTIONS="${EXPORTED_FUNCTIONS}" \\
    -s EXPORTED_RUNTIME_METHODS="${EXPORTED_RUNTIME_METHODS}" \\
    -s ALLOW_MEMORY_GROWTH=1 \\
    -s INITIAL_MEMORY=${INITIAL_MEMORY} \\
    -s MAXIMUM_MEMORY=${MAXIMUM_MEMORY} \\
    -s INVOKE_RUN=0 \\
    -s EXIT_RUNTIME=0 \\
    -s ENVIRONMENT='web' \\
    -s SINGLE_FILE=0 \\
    -lnodefs.js \\
    -lproxyfs.js \\
    -lidbfs.js \\
    -s STACK_SIZE=5MB \\
    -O2 # Optimization level (can be 0, 1, 2, 3, s, z)
    # Add other necessary flags

# Check if linking was successful
if [ $? -ne 0 ]; then
    echo "Error: Linking failed."
    exit 1
fi

# Check for output files
if [ ! -f "${OUTPUT_DIR}/spice.js" ] || [ ! -f "${OUTPUT_DIR}/spice.wasm" ]; then
    echo "Error: Output files (spice.js or spice.wasm) not found after linking."
    exit 1
fi

echo "Build successful. Output files are in ${OUTPUT_DIR}" 