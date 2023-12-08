import browser from "webextension-polyfill";

import inject from '../injected/main.ts?worker&url'; // Worker so the code gets transpiled
import { applyDefaultSettings } from "~/lib/Settings";
const injectURL = browser.runtime.getURL(inject);

// TODO lsp
// const background = browser.runtime.connect();
// window.addEventListener('message', event => {
//     if (event.source === window && event.data?.type?.startsWith('cx-lsp-'))
//     background.postMessage(event.data);
//     { }
// });
// background.onMessage.addListener(data => window.postMessage(data, "*"));

(async function () {
    const scriptReady = new Promise<void>(res => {
        function resolver(event: MessageEvent) {
            if (event.source === window && event.data?.type === 'cxm-ready') {
                window.removeEventListener('message', resolver)
                res();
            }
        }

        window.addEventListener('message', resolver);
    });

    const script = document.createElement("script");
    script.src = injectURL;
    document.head.appendChild(script);

    let settings = applyDefaultSettings((await browser.storage.sync.get('settings'))['settings']);
    let loaded = false;

    await browser.storage.sync.set({ 'settings': settings });
    await scriptReady;

    browser.storage.sync.onChanged.addListener((changed) => {
        if (loaded && changed.settings?.newValue) {
            window.postMessage({
                type: 'cxm-settings',
                settings: changed.settings.newValue
            });
        }
    });

    if (document.location.pathname.startsWith('/ide2/')) {
        loaded = true;
        window.postMessage({ type: 'cxm-init', settings });
    }

    browser.runtime.onMessage.addListener(async (msg, sender) => {
        if (msg === 'cxm-update-event') {
            if (document.location.pathname.startsWith('/ide2/')) {
                if (!loaded) {
                    loaded = true;
                    window.postMessage({ type: 'cxm-init', settings });
                }

            } else if (loaded) {
                loaded = false;
                window.postMessage({ type: 'cxm-unload' });
            }
        }
    });
})();

// document.querySelectorAll(`script[src="${injectURL}"]`).forEach(script => script.remove())