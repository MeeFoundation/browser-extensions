import { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const popup_inputs = [resolve(__dirname, "./popup.js")];
const background_inputs = [
  resolve(__dirname, "./background.js"),
  resolve(__dirname, "./content.js"),
];

const isPopupBuild = process.env.APP_FILE === "popup";
const isSafari = process.env.APP_BROWSER === "safari";

const copy_targets = [
  {
    src: "_locales",
    dest: "",
  },
  {
    src: "_metadata",
    dest: "",
  },
  {
    src: "gpc-scripts",
    dest: "",
  },
  {
    src: "images",
    dest: "",
  },
  {
    src: "manifest.json",
    dest: "",
  },
  {
    src: "rules.json",
    dest: "",
  },
  {
    src: "popup.css",
    dest: "",
  },
  {
    src: "popup.html",
    dest: "",
  },
];

const outDir = isSafari
  ? "../MeeExtensionMac/Shared (Extension)/Resources"
  : "dist";

export default defineConfig({
  build: {
    emptyOutDir: !isPopupBuild ? true : false,
    outDir: outDir,
    minify: "terser",
    sourcemap: false,
    commonjsOptions: {
      include: [],
    },
    rollupOptions: {
      input: isPopupBuild ? popup_inputs : background_inputs,
      output: {
        entryFileNames({ name }) {
          return `${name}.js`;
        },
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: isPopupBuild ? [] : copy_targets,
    }),
  ],
});
