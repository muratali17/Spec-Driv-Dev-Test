import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static single-page build. No cross-origin-isolation headers are required
// because the single-threaded lite Stockfish build does not use SharedArrayBuffer.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  preview: {
    port: 4173,
  },
});
