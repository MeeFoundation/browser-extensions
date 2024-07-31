// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { viteStaticCopy, Target } from "vite-plugin-static-copy";

const copy_targets: Target[] = [
  {
    src: "src/gpc-scripts",
    dest: "",
  },
];

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "main.ts"),
      name: "MeeExtensionLib",
      fileName: "mee-extension-lib",
    },
  },
  plugins: [
    dts(),
    viteStaticCopy({
      targets: copy_targets,
    }),
  ],
});
