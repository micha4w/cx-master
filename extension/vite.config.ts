import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import { getManifestChrome, getManifestFirefox } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      svelte(),
      webExtension({
        browser: process.env.CX_BROWSER,
        manifest: process.env.CX_BROWSER === 'chrome' ? getManifestChrome : getManifestFirefox,
      }),
    ],
    worker: {
      // To allow for dynamic importing in your injected.ts?url&worker TODO
      format: "es" as const
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  };
});
