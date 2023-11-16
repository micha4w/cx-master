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

    return '/' + path;
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

// https://stackoverflow.com/a/70267397
export function listenToSockets(callback: (e: { data: string, socket: WebSocket, event: MessageEvent }) => void = console.log) {
    let property = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");

    const data = property.get;

    function lookAtMessage() {
        let socket = this.currentTarget instanceof WebSocket;
        if (!socket)
            return data.call(this);

        let msg = data.call(this);

        Object.defineProperty(this, "data", { value: msg });
        callback({ data: msg, socket: this.currentTarget, event: this });
        return msg;
    }

    property.get = lookAtMessage;

    Object.defineProperty(MessageEvent.prototype, "data", property);
}