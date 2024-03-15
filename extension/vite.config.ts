import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import { getManifestChrome, getManifestFirefox } from "./src/manifest";

const browser = process.env.CX_BROWSER ?? 'firefox'

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      svelte(),
      webExtension({
        browser,
        manifest: browser === 'chrome' ? getManifestChrome : getManifestFirefox,
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
