import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "/oficina/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "cn": fileURLToPath(new URL("./src/lib/utils.ts", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        oficina: fileURLToPath(new URL("./index.html", import.meta.url)),
        obrigado: fileURLToPath(
          new URL("./obrigado/index.html", import.meta.url),
        ),
      },
    },
  },
});
