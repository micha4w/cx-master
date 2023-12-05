import type { Terminal } from 'xterm';

export var cx_data : {
	settings : Settings;
	editor : AceAjax.Editor;
    terminal: Terminal;
} = { settings: undefined, editor: undefined, terminal: undefined };


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
    document.getSelection
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

export function waitForTerminal() {
    const terminal_wrapper = document.querySelector('button[title=Compile]').closest('[data-testid=split-view-view]');
    const key = Object.keys(terminal_wrapper).find(key => key.startsWith('__reactFiber$'));
    cx_data.terminal = terminal_wrapper[key].child.updateQueue.lastEffect.deps[0];

}


export function getAntTreePath(el: Element) {
    let path = el.textContent.trim();
    let indent = el.querySelector('.ant-tree-indent').clientWidth;

    while (el = el.previousElementSibling) {
        let nextIndent = el.querySelector('.ant-tree-indent').clientWidth;

        if (nextIndent < indent) {
            if (nextIndent == 0) break;

            path = el.textContent.trim() + '/' + path;
            indent = nextIndent;
        }
    }

    return path;
}

export function getCurrentFile() {
    const el = document.querySelector('[data-test=project-tree-panel] .ant-tree-treenode-selected');
    return getAntTreePath(el);
}

export function openFile(path: string) {
    const tree = document.querySelector('[data-test=project-tree-panel] .ant-tree-list-holder-inner');
    if (tree.children[0].classList.contains('ant-tree-treenode-switcher-close')) {
        (tree.children[0].querySelector('.ant-tree-switcher') as HTMLElement).click();
    }

    const paths = path.split('/');
    let current = 0;
    for (let i = 1; i < tree.children.length; i++) {
        const indent = tree.children[i].querySelector('.ant-tree-indent').children.length - 1;
        if (indent < current) {
            break;
        }

        if (indent == current && tree.children[i].textContent.trim() === paths[current]) {
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