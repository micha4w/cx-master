import browser from "webextension-polyfill";
import pkg from "~/../package.json"

const NATIVE_ID = 'ch.micha4w.cx_lsp';
let is_up_to_date = false;

async function ensureVersion() {
    if (CX_DEBUG) console.log('ensureVersion::is_up_to_date:', is_up_to_date)
    if (is_up_to_date) return
    
    if (CX_DEBUG) console.log('ensureVersion: trying to update to version', pkg.version)
    while (true) {
        const response = await browser.runtime.sendNativeMessage(NATIVE_ID, {
            type: "ensure-version",
            version: pkg.version,
        });
        if (response.type !== 'ensure-version') {
            throw new Error(response);
        }
        const status = response.status as "updated" | "already-updated" | "already-updating";

        if (CX_DEBUG) console.log('ensureVersion::reponse:', response)

        switch (status) {
            case "already-updated":
            case "updated":
                is_up_to_date = true;
                return;
            case "already-updating":
                await new Promise((res) => setTimeout(res, 5000));
                break;
        }
    }
}


browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    browser.tabs.sendMessage(tabId, 'cxm-update-event').catch(() => {});
});

browser.runtime.onMessage.addListener(async (message) => {
    await ensureVersion();

    if (CX_DEBUG) console.log("single_message::message:", message)
    const response = await browser.runtime.sendNativeMessage(NATIVE_ID, message);
    if (CX_DEBUG) console.log("single_message::response:", response)
    if (response.type === 'error')
        throw new Error(response.data);

    return response;
});

browser.runtime.onConnect.addListener(async (content) => {
    await ensureVersion();

    const native = browser.runtime.connectNative(NATIVE_ID);

    native.onMessage.addListener(message => {
        if (message.type === 'error' || message.type === 'panic') {
            console.error(message);
        } else if (message.type === 'warning') {
            console.warn(message);
        } else if (CX_DEBUG) {
            console.log("LSP:", message);
        }

        content.postMessage(message);
    });


    content.onMessage.addListener(message => {
        if (CX_DEBUG) console.log("ACE:", message);
        native.postMessage(message);
    });

    content.onDisconnect.addListener(() => {
        native.disconnect();
        if (CX_DEBUG) console.log("Connection closed by ACE");
    })

    native.onDisconnect.addListener(() => {
        if (native.error) {
            content.postMessage({ type: "error", data: native.error });
            console.error(native.error);
        }
            
        if (CX_DEBUG) console.log("Connection closed by LSP");
        content.disconnect();
    });
});