import { ShortcutsHandler } from './handlers/shortcuts';
import { OptionsHandler } from './handlers/options';
import { KeybindsHandler } from './handlers/keybinds';
import { LSPHandler } from './handlers/lsp';
import { onMessage, sendMessage, cx_data } from '~/lib/Utils';

let handlers: ISettingsHandler[] = [];

function editorLoaded() {
    if (CX_DEBUG) console.log('CX: Editor reloaded');
    cx_data.editor = ace.edit('ace-editor');
    for (const handler of handlers) {
        handler.onLoadEditor?.();
    }
}

onMessage('init', async (settings, root) => {
    cx_data.settings = settings;
    cx_data.root = root;

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

    const container = document.querySelector("#cx-ide .split-view-container")!.children;
    const main_container = container[2].querySelector(".split-view-container")!.children;
    cx_data.containers = {
        left_tabs: container[0],
        left_panel: container[1],
        
        editor_surface: main_container[0],

        lower_panel: main_container[1],
        lower_tabs: main_container[2],

        right_panel: container[3],
        right_tabs: container[4],
    }

    const key = Object.keys(cx_data.containers.lower_panel).find(key => key.startsWith('__reactFiber$'));
    if (key)
        cx_data.terminal = (cx_data.containers.lower_panel as any)[key].child.updateQueue.lastEffect.deps[0];

    handlers = [
        new ShortcutsHandler(),
        new OptionsHandler(),
        new KeybindsHandler(),
        new LSPHandler(),
    ];

    for (const handler of handlers) {
        handler.onLoad?.();
    }

    if (document.querySelector('#ace-editor')) editorLoaded();
    document.addEventListener("cxAceMounted", editorLoaded, { capture: true });

    if (CX_DEBUG) console.log('CX: Successfully injected script');
});

onMessage('settings', async (settings) => {
    const oldSettings = cx_data.settings;
    cx_data.settings = settings;

    for (const handler of handlers) {
        handler.onUpdate?.(oldSettings);
    }
});

onMessage('unload', async () => {
    document.removeEventListener("cxAceMounted", editorLoaded, { capture: true });

    for (const handler of handlers) {
        handler.onUnload?.();
    }

    handlers = [];

    if (CX_DEBUG) console.log('CX: Successfully unloaded script');
});

sendMessage('ready');