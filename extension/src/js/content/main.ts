import browser from "webextension-polyfill";

import inject from '../injected/main.ts?worker&url'; // Worker so the code gets transpiled
import { applyDefaultSettings } from "~/lib/Settings";
import { onMessage, sendMessage } from "~/lib/Utils";
const injectURL = browser.runtime.getURL(inject);

if (CX_DEBUG) console.log('CX: Running content script');

(async function () {
    const scriptReady = new Promise<void>(res => onMessage('ready', res, true));

    const script = document.createElement("script");
    script.src = injectURL;
    script.type = 'module';
    document.head.appendChild(script);

    let settings = applyDefaultSettings((await browser.storage.sync.get('settings'))['settings']);
    let loaded = false;

    await browser.storage.sync.set({ 'settings': settings });
    await scriptReady;

    let background: browser.Runtime.Port | undefined;
    onMessage('lsp-start', (id) => {
        background = browser.runtime.connect();
        background.onMessage.addListener(message => {
            sendMessage('lsp-' + message.type as any, message.data);
        });
        background.onDisconnect.addListener(() => {
            sendMessage('lsp-stop');
            background = undefined;
        });
        background.postMessage({ type: 'start', id })
    });
    onMessage('lsp-stop', () => {
        background?.postMessage({ type: 'stop' });
        background?.disconnect();
        background = undefined;
    });
    onMessage('lsp-request', (message) => {
        background?.postMessage({ type: 'request', message });
    });
    onMessage('lsp-file', ({ path, content }) => {
        background?.postMessage({ type: 'file', path, content });
    });

    browser.storage.sync.onChanged.addListener((changed) => {
        settings = changed.settings.newValue;
        if (loaded && changed.settings?.newValue) {
            sendMessage('settings', changed.settings.newValue);
        }
    });

    if (document.location.pathname.startsWith('/ide2/')) {
        loaded = true;
        sendMessage('init', settings, browser.runtime.getURL(''))
    }

    browser.runtime.onMessage.addListener(async (msg) => {
        if (msg === 'cxm-update-event') {
            if (document.location.pathname.startsWith('/ide2/')) {
                if (!loaded) {
                    loaded = true;
                    sendMessage('init', settings, browser.runtime.getURL(''));
                }

            } else if (loaded) {
                loaded = false;
                sendMessage('unload');
            }
        }
    });
})();

// document.querySelectorAll(`script[src="${injectURL}"]`).forEach(script => script.remove())