import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/domain-schema-builder/",
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: [".."], // разрешить чтение из родительской папки
    },
  },
  optimizeDeps: {
    // ядро — локальный пакет, его нужно пересобирать
    exclude: ["domain-schema-builder"],
  },
});
