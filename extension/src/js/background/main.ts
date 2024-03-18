import browser from "webextension-polyfill";
import pkg from "~/../package.json"

const NATIVE_ID = 'ch.micha4w.cx_lsp';
let is_up_to_date = false;


async function ensureVersion() {
    if (is_up_to_date) return
    
    while (true) {
        const clangd = browser.runtime.connectNative(NATIVE_ID);

        const responsePromise = new Promise<any>(res => clangd.onMessage.addListener(res));
        clangd.postMessage({ type: "ensure-version", version: pkg.version });
        const { updating } = await responsePromise;

        if (!updating) {
            is_up_to_date = true;
            return;
        }

        await new Promise((res) => clangd.onDisconnect.addListener(res));
        await new Promise((res) => setTimeout(res, 5000));
    }
}


browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    browser.tabs.sendMessage(tabId, 'cxm-update-event').catch(() => {});
});

browser.runtime.onMessage.addListener(async (message) => {
    await ensureVersion();
    return browser.runtime.sendNativeMessage(NATIVE_ID, message);
});

browser.runtime.onConnect.addListener(async (content) => {
    await ensureVersion();

    const native = browser.runtime.connectNative(NATIVE_ID);

    native.onMessage.addListener(message => {
        if (message.type === 'error' || message.type === 'panic') {
            console.error(message);
        } else if (message.type === 'warning') {
            console.warn(message);
        } else {
            // console.info(message);
        }

        content.postMessage(message);
    });


    content.onMessage.addListener(message => {
        // console.log(message);
        native.postMessage(message);
    });

    content.onDisconnect.addListener(() => {
        native.disconnect();
        // console.log("Disconnected1");
    })

    native.onDisconnect.addListener(() => {
        if (native.error) {
            content.postMessage({ type: "error", data: native.error });
            console.error(native.error);
        }
            
        content.disconnect();
        // console.log("Disconnected2");
    });
});