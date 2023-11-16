import 'ace-builds/src-min-noconflict/ext-beautify';
import 'ace-builds/src-min-noconflict/keybinding-vim';
import 'ace-builds/src-min-noconflict/keybinding-emacs';
import 'ace-builds/src-min-noconflict/keybinding-vscode';
import 'ace-builds/src-min-noconflict/keybinding-sublime';

import { ShortcutsHandler } from './handlers/shortcuts';
import { OptionsHandler } from './handlers/options';
import { KeybindsHandler } from './handlers/keybinds';
import { listenToSockets } from '~/lib/Utils';



listenToSockets(({data, socket, event}) => {
    if (!data.startsWith('a'))
        return;

    const json = JSON.parse(JSON.parse(data.substring(1))[0]);
    for (const listener of socketListeners) {
        listener(json);
    }
})

const handlers : ISettingsHandler[] = [new ShortcutsHandler(), new OptionsHandler(), new KeybindsHandler()];
export const socketListeners : ((json: any) => void)[] = [];

window.addEventListener('message', async function (event) {
    if (event.source !== window || !event.data)
        return;

    if (event.data.type === 'cxm-init') {
        // console.log('onLoad', settings)

        for (const handler of handlers) {
            handler?.onLoad(event.data.settings);
        }
    }

    if (event.data.type === 'cxm-settings') {
        // console.log('onUpdate', settings)

        for (const handler of handlers) {
            handler?.onUpdate(event.data.settings);
        }
    }

    // TODO unloading
});
window.postMessage({ type: 'cxm-ready' });



// TODO filter out the LSP code
// import { AceLanguageClient } from "ace-linters/build/ace-language-client";
// // @ts-ignore
// import worker from 'url:./worker.ts';

// function getAntTreePath(el: Element) {
//     let path = el.textContent.trim();
//     let indent = el.querySelector('.ant-tree-indent').clientWidth;

//     while (el = el.previousElementSibling) {
//         let nextIndent = el.querySelector('.ant-tree-indent').clientWidth;

//         if (nextIndent < indent) {
//             if (nextIndent == 0) break;

//             path = el.textContent.trim() + '/' + path;
//             indent = nextIndent;
//         }
//     }

//     return '/' + path;
// }


//         const observer = new MutationObserver(record => {
//             if (pred()) {
//                 resolve();
//                 observer.disconnect();
//             }
//         });

//         observer.observe(document.body, {
//             childList: true,
//             subtree: true
//         });
//     });
// }

// declare var ace;
// const acePromise = (async () => {
//     await waitForElm(() => document.querySelector('.ace_content') !== null);
//     return ace.edit('ace-editor') as Ace.Ace.Editor;
// })();
// acePromise.then(editor => {
//     window.postMessage({
//         type: 'cx-lsp-filename',
//         session: (editor.session as any).id,
//         filename: getAntTreePath(document.querySelector('.ant-tree-treenode-selected'))
//     }, "*");

//     const OG_SETSESSION = editor.setSession;
//     editor.setSession = function (...args) {
//         const session = (editor.session as any).id as string;
//         const id = +session.match(/^session(\d+)$/)[1];

//         window.postMessage({
//             type: 'cx-lsp-filename',
//             session: "session" + (id + 1),
//             filename: getAntTreePath(document.querySelector('.ant-tree-treenode-selected')),
//         }, "*");

//         OG_SETSESSION.apply(this, [...args]);
//     }
// });


// window.addEventListener('message', async function (event) {
//     if (event.source !== window || !event.data)
//         return;

//     if (event.data.type === 'cx-lsp-port') {
//         let editor = await acePromise;

//         // Wait for the file to have content
//         await waitForElm(() => editor.getValue() != '');
        
//         const ws = new WebSocket("ws://localhost:" + event.data.port);
//         let languageProvider = AceLanguageClient.for(ws);
//         languageProvider.registerEditor(editor);
//     }
// });

// listenToSockets(async ({ data }) => {
//     if (!data.startsWith('a'))
//         return;

//     // TODO do something on file created / file edited
//     const json = JSON.parse(JSON.parse(data.substring(1))[0]);
//     if (json.msg === 'result' && Array.isArray(json.result) && json.result.length > 0 && json.result[0].isLeaf !== undefined) {
//         const path = new URL(document.URL).pathname;
//         const project_id = path.substring(path.lastIndexOf('/') + 1);

//         const files: { path: string, content: string }[] = []
//         const handleFile = async (file: any) => {
//             if (file.isLeaf) {
//                 const content = await fetch(`https://expert.ethz.ch/cx_project_file/${file.fileId}/${file.key}/?projectId=${project_id}`);

//                 files.push({
//                     path: file.path,
//                     content: await content.text()
//                 });
//             } else {
//                 await Promise.all(file.children.map(handleFile));
//             }
//         };

//         await handleFile(json.result[0]);
//         window.postMessage({ type: 'cx-lsp-init', files }, "*");

//         let editor = await acePromise;
//         await waitForElm(() => editor.getValue() != '');

//         const ww = new Worker(worker);
//         let languageProvider = AceLanguageClient.for(ww);
//         languageProvider.registerEditor(editor);
//     }
// });

