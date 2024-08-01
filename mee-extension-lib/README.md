# Mee Extension Library

## Build

- pnpm build

## Install package into Mee extension

```sh
  pnpm add ./mee-extension-lib
```

## Copy gpc-scripts during build

### with vite-plugin-static-copy plugin

    import { viteStaticCopy, Target } from "vite-plugin-static-copy";

    export default defineConfig({
      plugins: [
        viteStaticCopy({
          targets: [{src: "node_modules/mee-extension-lib/dist/gpc-scripts",dest: "",}],
        }),
      ],
    })
