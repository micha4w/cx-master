import browser from "webextension-polyfill";



browser.tabs.onUpdated.addListener((tabid, info, tab) => {
    browser.tabs.sendMessage(tabid, 'cxm-update-event');
});

browser.runtime.onMessage.addListener(console.info);

browser.runtime.onConnect.addListener(content => {
    // console.log(content.sender.tab.id);

    // browser.tabs.get(content.sender.tab.id).then(tab => {
    //     tab.
    // });

    // TODO lsp
    // const clangd = browser.runtime.connectNative('cx_lsp');

    // content.onMessage.addListener(message => {
    //     clangd.postMessage(message);
    // });

    // clangd.onMessage.addListener(message => {
    //     if (message['type'] === 'error') {
    //         console.error(message);
    //     } else {
    //         console.log(message);
    //     }

    //     content.postMessage(message);
    // });

    // clangd.onDisconnect.addListener(_ => {
    //     console.log("Disconnected");
    // });
});
