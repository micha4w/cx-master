import browser from "webextension-polyfill";

import script from '../accesible/main.ts?worker&url';
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

document.addEventListener(
    "cxAceMounted",
    async () => {
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

        let settings = (await browser.storage.sync.get('settings'))['settings'];
        settings = applyDefaultSettings(settings);

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
    // TODO capture more than once, but unload before callin onLoad again
    // cxAceMounted gets again if you select a folder and then a file again
    { capture: true, once: true }
);
