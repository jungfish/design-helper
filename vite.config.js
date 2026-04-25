import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:5175",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        palette: resolve(__dirname, "palette/index.html"),
        appartementPalette: resolve(__dirname, "appartement-palette/index.html"),
      },
    },
  },
});
