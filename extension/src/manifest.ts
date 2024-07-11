import pkg from "../package.json";

const icons = {
  64: "icons/cxm-icon-64.png",
  128: "icons/cxm-icon-128.png",
  512: "icons/cxm-icon-512.png",
};

const manifest = {
  author: pkg.author,
  description: pkg.description,
  name: pkg.displayName ?? pkg.name,
  version: pkg.version,
  content_scripts: [
    {
      js: ["src/js/content/main.ts"],
      matches: ["https://expert.ethz.ch/*"],
      run_at: "document_idle",
    },
  ],
  icons,
};

export function getManifestFirefox(): chrome.runtime.ManifestV2 {
  console.info('Using firefox Manifest');
  /** @ts-ignore */
  return {
    manifest_version: 2,
    background: {
      scripts: ["src/js/background/main.ts"],
    },
    browser_action: {
      default_icon: { ...icons },
      default_popup: "src/ui/popup/index.html",
    },
    browser_specific_settings: {
      gecko: {
        id: pkg.name + '@micha4w.ch',
      }
    },
    permissions: [
      "nativeMessaging",
      "storage"
    ],
    ...manifest,
  };
}


export function getManifestChrome(): chrome.runtime.ManifestV3 {
  console.info('Using chrome Manifest');
  /** @ts-ignore */
  return {
    manifest_version: 3,
    background: {
      service_worker: "src/js/background/main.ts",
    },
    action: {
      default_icon: { ...icons },
      default_popup: "src/ui/popup/index.html",
    },
    web_accessible_resources: [
      {
        resources: [
          "assets/*",
        ],
        matches: [
          "https://expert.ethz.ch/*"
        ],
      }
    ],
    permissions: [
      "nativeMessaging",
      "storage"
    ],
    ...manifest,
  };
}