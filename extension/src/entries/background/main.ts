import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener(console.log)

browser.runtime.onConnect.addListener(content => {
    const clangd = browser.runtime.connectNative('cx_lsp');

    content.onMessage.addListener(message => {
        clangd.postMessage(message);
    });

    clangd.onMessage.addListener(message => {
        if (message['type'] === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }

        content.postMessage(message);
    });

    clangd.onDisconnect.addListener(_ => {
        console.log("Disconnected");
    });
});