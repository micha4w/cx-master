import browser from "webextension-polyfill";

const NATIVE_ID = 'ch.micha4w.cx_lsp';

browser.tabs.onUpdated.addListener((tabid, info, tab) => {
    browser.tabs.sendMessage(tabid, 'cxm-update-event').catch(() => {});
});

browser.runtime.onMessage.addListener(async (message) => {
    return browser.runtime.sendNativeMessage(NATIVE_ID, message);
});

browser.runtime.onConnect.addListener(content => {
    const native = browser.runtime.connectNative(NATIVE_ID);

    native.onMessage.addListener(message => {
        if (message.type === 'error' || message.type === 'panic') {
            console.error(message);
        } else if (message.type === 'warning') {
            console.warn(message);
        } else {
            content.postMessage(message);
            // console.info(message);
        }
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
        if (native.error)
            console.error(native.error);
            
        content.disconnect();
        // console.log("Disconnected2");
    });
});