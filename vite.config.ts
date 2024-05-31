import { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy, Target } from "vite-plugin-static-copy";

const popup_inputs = [resolve(__dirname, "./src/popup/popup.ts")];
const options_inputs = [resolve(__dirname, "./src/options/options.ts")];
const background_inputs = [
  resolve(__dirname, "./src/background.ts"),
  resolve(__dirname, "./src/content/content.ts"),
];

const isPopupBuild = process.env.APP_FILE === "popup";
const isOptionsBuild = process.env.APP_FILE === "options";

const target = process.env.VITE_BROWSER || "chrome";
const isSafari = target === "safari";
const isFirefox = target === "firefox";
const isFirefoxAndroid = target === "firefox-android";

const manifestFile = `${target}/manifest.json`;

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
    src: "src/gpc-scripts",
    dest: "",
  },
  {
    src: "src/images",
    dest: "",
  },
  {
    src: manifestFile,
    dest: "",
  },
  {
    src: "rules.json",
    dest: "",
  },
  {
    src: "src/popup/popup.css",
    dest: "",
  },
  {
    src: "src/popup/popup.html",
    dest: "",
  },
  {
    src: "src/options/options.html",
    dest: "",
  },
  {
    src: "src/options/options.css",
    dest: "",
  },
  {
    src: "src/content/template.html",
    dest: "",
  },
  {
    src: "pkg/hello_world_bg.wasm",
    dest: "pkg/",
  },
];

let outDir = "dist/chrome";
if (isSafari) outDir = "../MeeExtensionMac/Shared (Extension)/Resources";
if (isFirefox) outDir = "dist/firefox";
if (isFirefoxAndroid) outDir = "dist/firefox-android";

const getInput = () => {
  if (isPopupBuild) {
    return popup_inputs;
  } else if (isOptionsBuild) {
    return options_inputs;
  } else {
    return background_inputs;
  }
};

export default defineConfig({
  build: {
    emptyOutDir: !isPopupBuild && !isOptionsBuild ? true : false,
    outDir: outDir,
    minify: false,
    sourcemap: true,
    commonjsOptions: {
      include: [],
    },
    rollupOptions: {
      input: getInput(),
      output: {
        entryFileNames({ name }) {
          return `${name}.js`;
        },
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: isPopupBuild || isOptionsBuild ? [] : copy_targets,
    }),
  ],
});
