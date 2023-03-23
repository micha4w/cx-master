const clangd = browser.runtime.connectNative("clangd");

clangd.onMessage.addListener(rp => console.log("response", rp));
clangd.onDisconnect.addListener(rp => console.log("disconected", rp));

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log(clangd, "receieved", JSON.stringify(message));
    clangd.postMessage(JSON.stringify(message));

    // let responded = false;

    // await new Promise(() => responded);
    console.log("asdf");
    sendResponse("TEst");
});