import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  output: "static",
  server: { port: 4321 },
  vite: {
    server: {
      proxy: {
        "/ws": { target: "ws://localhost:8080", ws: true },
        "/api": "http://localhost:8080",
      },
    },
  },
});
