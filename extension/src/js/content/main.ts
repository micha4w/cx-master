import browser from "webextension-polyfill";

import inject from '../injected/main.ts?worker&url'; // Worker so the code gets transpiled
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


// TODO lsp
// const background = browser.runtime.connect();
// window.addEventListener('message', event => {
//     if (event.source === window && event.data?.type?.startsWith('cx-lsp-'))
//     background.postMessage(event.data);
//     { }
// });
// background.onMessage.addListener(data => window.postMessage(data, "*"));

(async function () {
    // Wait until the last spinner gets removed, means the page is done loading
    await new Promise<void>(res => {
        new MutationObserver((mutations, observer) => {
            if (
                mutations.length === 1 &&
                (mutations[0].target as HTMLElement).getAttribute?.('data-test') === 'ide-info-panel' &&
                mutations[0].removedNodes.length === 1 &&
                (mutations[0].removedNodes[0] as HTMLElement).children[0].classList.contains('ant-spin-nested-loading')
            ) {
                observer.disconnect();
                res();
            };
        }).observe(document, { childList: true, subtree: true });
    });

    const scriptReady = new Promise<void>(res => {
        function resolver(event: MessageEvent) {
            if (event.source === window && event.data?.type === 'cxm-ready') {
                window.removeEventListener('message', resolver)
                res();
            }
        }

        window.addEventListener('message', resolver);
    });

    reinjectScript(browser.runtime.getURL(inject));


    let settings = applyDefaultSettings((await browser.storage.sync.get('settings'))['settings']);
    const settingsReady = browser.storage.sync.set({ 'settings': settings });

    await scriptReady;
    window.postMessage({ type: 'cxm-init', settings });

    await settingsReady;
    browser.storage.sync.onChanged.addListener((changed) => {
        if (changed['settings'] && changed.settings.newValue) {
            window.postMessage({
                type: 'cxm-settings',
                settings: changed.settings.newValue
            });
        }
    })
})();