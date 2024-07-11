import type { LanguageProvider } from 'ace-linters/types/language-provider';
import type { Socket } from 'socket.io-client';
import type { Terminal } from 'xterm';

// @ts-ignore
export var cx_data: {
    settings: Settings;
    root: string;
    containers: {
        left_tabs: Element,
        left_panel: Element,
        editor_surface: Element,
        lower_panel: Element,
        lower_tabs: Element,
        right_panel: Element,
        right_tabs: Element,
    };
    editor?: AceAjax.Editor;
    terminal?: Terminal;
    io?: Socket;
    lsp?: LanguageProvider;
} = {};

interface CXEventMap {
    "init": [settings: Settings, addonPath: string];
    "settings": [settings: Settings];
    "unload": [];
    "ready": [];
    "lsp-start": [id: string];
    "lsp-stop": [];
    "lsp-error": [message: string];
    "lsp-file": [file: { path: string, content: string }];
    "lsp-directory": [directory: string];
    "lsp-request": [message: string];
    "lsp-response": [message: string];
}

export function sendMessage<K extends keyof CXEventMap>(type: K, ...arg: CXEventMap[K]) {
    window.postMessage({ type, arg }, '*'); // TODO use different '*'
}

export function onMessage<K extends keyof CXEventMap>(type: K, listener: (...arg: CXEventMap[K]) => any, once?: boolean) {
    const wrapped = (event : MessageEvent) => {
        if (event.source === window && event.data?.type === type) {
            listener(...event.data.arg);
            if (once)
                window.removeEventListener('message', wrapped)
        }
    }
    window.addEventListener('message', wrapped);
}


export class CachedBind {
    private cachedBinds = new Map<any, any>();

    cachedBind<T extends Function>(method: T) {
        let bind = this.cachedBinds.get(method);
        if (bind === undefined) {
            bind = method.bind(this);
            this.cachedBinds.set(method, bind);
        }
        return bind;
    }
}


export function waitForElm(pred: () => boolean) {
    return new Promise<void>(resolve => {
        if (pred()) {
            resolve();
            return;
        }

        const observer = new MutationObserver(record => {
            if (pred()) {
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


export function getAntTreePath(el: Element) {
    let path = el.textContent!.trim();
    let indent = el.querySelector('.ant-tree-indent')!.clientWidth;

    while (el = el.previousElementSibling!) {
        let nextIndent = el.querySelector('.ant-tree-indent')!.clientWidth;

        if (nextIndent < indent) {
            if (nextIndent == 0) break;

            path = el.textContent!.trim() + '/' + path;
            indent = nextIndent;
        }
    }

    return path;
}

export function getCurrentFile() {
    const el = document.querySelector('[data-test=project-tree-panel] .ant-tree-treenode-selected') ?? undefined;
    return el ? getAntTreePath(el) : el;
}

export function openFile(path: string) {
    const tree = document.querySelector('[data-test=project-tree-panel] .ant-tree-list-holder-inner')!;
    if (tree.children[0].classList.contains('ant-tree-treenode-switcher-close')) {
        (tree.children[0].querySelector('.ant-tree-switcher') as HTMLElement).click();
    }

    const paths = path.split('/');
    let current = 0;
    for (let i = 1; i < tree.children.length; i++) {
        const indent = tree.children[i].querySelector('.ant-tree-indent')!.children.length - 1;
        if (indent < current) {
            break;
        }

        if (indent == current && tree.children[i].textContent?.trim() === paths[current]) {
            current++;
            if (current >= paths.length) {
                (tree.children[i].querySelector('.ant-tree-node-content-wrapper') as HTMLElement).click();
                return;
            }
        }
    }
    throw new Error(`File not found: ${path}`);
}

// export function getAntTree() {
//     const children = document.querySelector('.ant-tree-list-holder-inner').children;

//     for (let i = 1; i < children.length; i++) {
//         const child = children[i];
//     }
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