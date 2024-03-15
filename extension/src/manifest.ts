import pkg from "../package.json";


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
  icons: {
    64: "icons/64.png",
    512: "icons/512.png",
  },
};

export function getManifestFirefox(): chrome.runtime.ManifestV2 {
  /** @ts-ignore */
  return {
    manifest_version: 2,
    background: {
      scripts: ["src/js/background/main.ts"],
    },
    browser_action: {
      default_icon: {
        128: "icons/cxm-icon-128.png",
      },
      default_popup: "src/ui/popup/index.html",
    },
    browser_specific_settings: {
      gecko: {
        id: pkg.name + '@micha4w.ch',
        strict_min_version: "57.0",
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
  /** @ts-ignore */
  return {
    manifest_version: 3,
    key: "Y3hfbWFzdGVyQG1pY2hhNHcuY2g=",
    background: {
      service_worker: "src/js/background/main.ts",
    },
    action: {
      default_icon: {
        128: "icons/cxm-icon-128.png",
      },
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