import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import { getManifestChrome, getManifestFirefox } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      svelte(),
      webExtension({
        manifest: process.env.CX_BROWSER === 'chrome' ? getManifestChrome() : getManifestFirefox(),
      }),
    ],
    worker: {
      // To allow for dynamic importing in your injected.ts?url&worker
      format: 'es'
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  };
});
