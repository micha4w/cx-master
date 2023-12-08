import { ShortcutsHandler } from './handlers/shortcuts';
import { OptionsHandler } from './handlers/options';
import { KeybindsHandler } from './handlers/keybinds';
import { cx_data } from '~/lib/Utils';

let handlers: ISettingsHandler[] = [];

function editorLoaded() {
    cx_data.editor = ace.edit('ace-editor');
    for (const handler of handlers) {
        handler.onLoadEditor?.();
    }
}

window.addEventListener('message', async function (event) {
    if (event.source !== window || !event.data)
        return;

    // if (event.data.type?.startsWith?.('cxm-'))
    //     console.log(event)

    const oldSettings = cx_data.settings;
    if (event.data.settings)
        cx_data.settings = event.data.settings;

    if (event.data.type === 'cxm-init') {
        if (!document.querySelector('svg[data-test-id=project-info]')) {
            const meteorSocket: WebSocket = Meteor?.connection?._stream?.socket;
            await new Promise<void>(res => {
                meteorSocket?.addEventListener('message', (event) => {
                    if (JSON.parse(event.data)?.result?.environment) {
                        res();
                    }
                });
            });
        }

        const terminal_wrapper = document.querySelector('button[title=Compile]')?.closest('[data-testid=split-view-view]');

        // No terminal exists in text exercises
        if (terminal_wrapper) {
            const key = Object.keys(terminal_wrapper).find(key => key.startsWith('__reactFiber$'));
            cx_data.terminal = terminal_wrapper[key].child.updateQueue.lastEffect.deps[0];
        }

        handlers = [
            new ShortcutsHandler(),
            new OptionsHandler(),
            new KeybindsHandler(),
        ];

        for (const handler of handlers) {
            handler.onLoad?.();
        }

        if (document.querySelector('#ace-editor')) editorLoaded();
        document.addEventListener("cxAceMounted", editorLoaded, { capture: true });
    }

    if (event.data.type === 'cxm-settings') {
        for (const handler of handlers) {
            handler.onUpdate?.(oldSettings);
        }
    }

    if (event.data.type === 'cxm-unload') {
        document.removeEventListener("cxAceMounted", editorLoaded, { capture: true });

        for (const handler of handlers) {
            handler.onUnload?.();
        }

        handlers = [];
    }
});

window.postMessage({ type: 'cxm-ready' });