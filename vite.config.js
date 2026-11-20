import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" }, remoteBindings: false }),
    tanstackStart({
      srcDirectory: "src",
      spa: { enabled: true, prerender: { outputPath: "/index.html" } },
    }),
    react(),
  ],
  environments: {
    ssr: { build: { rolldownOptions: { external: ["cloudflare:workers"] } } },
  },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
