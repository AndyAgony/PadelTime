import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // `npm run dev:web` against a running `wrangler dev` on :8787
      "/api": "http://127.0.0.1:8787",
    },
  },
});
