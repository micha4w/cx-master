import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "vite-plugin-web-extension";
import path from "path";
import { getManifestChrome, getManifestFirefox } from "./src/manifest";

const browser = process.env.CX_BROWSER ?? 'firefox';
const debug = process.env.CX_DEBUG && (process.env.CX_DEBUG === 'true' || Number.parseInt(process.env.CX_DEBUG) > 0);

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
    define: {
      CX_DEBUG: debug,
    },
    mode: debug ? 'development' : 'production',
    build: {
      minify: !debug,
    },
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
