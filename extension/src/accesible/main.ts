import { AceLanguageClient } from "ace-linters/build/ace-language-client";

declare var ace;

async function main() {
    console.log(ace)    ;
    // await new Promise(res => setTimeout(res, 10000))
    // console.log(window);
    // console.log(Object.keys(window).sort());
    // console.log(window['ace']);
    // console.log(ace);
    // let editor = ace.edit("ace-editor");
    // console.log("Editor", editor);

    // const ws = new WebSocket("ws://localhost:8080");
    // let languageProvider = AceLanguageClient.for(ws);
    // languageProvider.registerEditor(editor);
}


function waitForElm() {
    return new Promise<void>(resolve => {
        const editorExists = () => document.getElementsByClassName('ace_editor').length > 0;

        if (editorExists()) {
            resolve();
            return;
        }

        const observer = new MutationObserver(_ => {
            if (editorExists()) {
                resolve();
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

waitForElm().then(main);
