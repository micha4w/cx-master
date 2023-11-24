import browser from "webextension-polyfill";

import script from '../injected/main.ts?worker&url'; // Worker so the code gets transpiled
import { applyDefaultSettings } from "~/lib/Settings";

function reinjectScript(src: string) {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        if (script.src == src) {
            script.remove();
        }
    }
    const script = document.createElement("script");
    script.src = src;
    document.head.appendChild(script);
}


const background = browser.runtime.connect();
window.addEventListener('message', event => {
    if (event.source === window && event.data?.type?.startsWith('cx-lsp-'))
    // TODO
    // background.postMessage(event.data);
    { }
});

background.onMessage.addListener(data => window.postMessage(data, "*"));

let first = true;
document.addEventListener(
    "cxAceMounted",
    async () => {
        if (!first) {
            let settings = (await browser.storage.sync.get('settings'))['settings'];
            window.postMessage({ type: 'cxm-reload', settings });
            return;
        }
        first = false;

        const scriptReady = new Promise<void>(res => {
            function resolver(event : MessageEvent) {
                if (event.source === window && event.data?.type === 'cxm-ready') {
                    window.removeEventListener('message', resolver)
                    res();
                }
            }

            window.addEventListener('message', resolver);
        });
        reinjectScript(browser.runtime.getURL(script));

        let settings = applyDefaultSettings((await browser.storage.sync.get('settings'))['settings']);

        await browser.storage.sync.set({ 'settings': settings });
        await scriptReady;

        window.postMessage({ type: 'cxm-init', settings });

        browser.storage.sync.onChanged.addListener((changed) => {
            if (changed['settings'] && changed.settings.newValue) {
                window.postMessage({
                    type: 'cxm-settings',
                    settings: changed.settings.newValue
                });
            }
        })
    },
    { capture: true }
);
