import { defineConfig } from "vitest/config";

// `npm run build` writes the panel into the integration, which serves it to Home Assistant.
// `npm run dev` serves dev/index.html: the panel against a mocked Home Assistant.
export default defineConfig({
  root: ".",
  server: { open: "/dev/index.html" },
  build: {
    outDir: "../custom_components/populife/frontend",
    emptyOutDir: true,
    target: "es2022",
    minify: true,
    // Vite leaves ES library output readable; the panel ships as one file, so shrink it fully.
    rolldownOptions: { output: { minify: true } },
    lib: {
      entry: "src/populife-panel.ts",
      formats: ["es"],
      fileName: () => "populife-panel.js",
    },
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
