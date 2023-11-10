import { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy, Target } from "vite-plugin-static-copy";


const popup_inputs = [resolve(__dirname, "./popup.js")];
const background_inputs = [resolve(__dirname, "./background.js"), resolve(__dirname, "./content.js")];

const isPopupBuild = process.env.APP_FILE === "popup";

const target = process.env.VITE_BROWSER || "chrome";
const isSafari = target === "safari";
const isFirefox = target === "firefox";

const manifestFile = `manifest.${target}.json`;

const copy_targets: Target[] = [
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
    src: manifestFile,
    dest: "",
    rename: "manifest.json",
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
  : isFirefox
  ? "dist/firefox"
  : "dist/chrome";

export default defineConfig({
  build: {
    emptyOutDir: !isPopupBuild ? true : false,
    outDir: outDir,
    minify: "terser",
    sourcemap: true,
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

