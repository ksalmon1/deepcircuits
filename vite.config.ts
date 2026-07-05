import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    laravel({
      input: "resources/js/app.tsx",
      refresh: true,
    }),
    wasm(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./resources/js"),
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["@/simulation/spice.js"],
  },
});
