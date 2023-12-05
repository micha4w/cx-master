import pkg from "../package.json";

const manifest = {
  // background: {
  //   scripts: ["src/js/background/main.ts"],
  //   persistent: true,
  // },
  content_scripts: [
    {
      js: ["src/js/content/main.ts"],
      matches: ["https://expert.ethz.ch/ide2/*"],
      run_at: "document_idle",
    },
  ],
  browser_action: {
    default_icon: {
      64: "icons/64.png",
    },
    default_popup: "src/ui/popup/index.html",
  },
  icons: {
    64: "icons/64.png",
    512: "icons/512.png",
  },
  // options_ui: {
  //   chrome_style: false,
  //   open_in_tab: true,
  //   page: "src/entries/options/index.html",
  // },
  permissions: [
    "nativeMessaging",
    "storage"
  ],
};

export function getManifest(): chrome.runtime.ManifestV2 {
  return {
    author: pkg.author,
    description: pkg.description,
    name: pkg.displayName ?? pkg.name,
    version: pkg.version,
    manifest_version: 2,
    browser_specific_settings: {
      gecko: {
        id: pkg.name + '@micha4w.ch',
        strict_min_version: "57.0",
        update_url: "https://raw.githubusercontent.com/micha4w/cx-master/main/extension/updates-firefox.json"
      }
    },
    ...manifest,
  };
}
