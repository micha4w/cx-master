import * as ace from "ace-code";
import { AceLanguageClient } from "ace-linters/build/ace-language-client";


function main() {
    let editor = ace.edit("ace-editor");
    console.log("Editor", editor);arguments

    const ws = new WebSocket("ws://localhost:8080");
    let languageProvider = AceLanguageClient.for(ws);
    languageProvider.registerEditor(editor);
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
