import browser from "webextension-polyfill";



browser.tabs.onUpdated.addListener((tabid, info, tab) => {
    browser.tabs.sendMessage(tabid, 'cxm-update-event').catch(() => {});
});

browser.runtime.onMessage.addListener((message) => console.log(message));

browser.runtime.onConnect.addListener(content => {
    const clangd = browser.runtime.connectNative('cx_lsp');

    clangd.onMessage.addListener(message => {
        if (message.type === 'error' || message.type === 'panic') {
            console.error(message);
        } else if (message.type === 'warning') {
            console.warn(message);
        } else {
            content.postMessage(message);
            // console.info(message);
        }
    });

    clangd.postMessage({ "type": "ready" });

    content.onMessage.addListener(message => {
        // console.log(message);
        clangd.postMessage(message);
    });

    content.onDisconnect.addListener(() => {
        clangd.disconnect();
        // console.log("Disconnected1");
    })

    clangd.onDisconnect.addListener(() => {
        content.disconnect();
        // console.log("Disconnected2");
    });
});