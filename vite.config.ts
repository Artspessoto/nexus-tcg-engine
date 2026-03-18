// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "/toon-castle/",

  plugins: [],

  server: {
    port: 8080,
    open: true,
  },

  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
