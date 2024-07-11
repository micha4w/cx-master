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

let queue: (() => Promise<void>)[] = [];
async function appendTask(task: () => Promise<void>) {
    if (queue.length !== 0) {
        queue.push(task);
    } else {
        queue.push(task);
        let ran_task;
        while (ran_task = queue.shift()) {
            await ran_task();
        }
    }
}

onMessage('init', (settings, root) => appendTask(async () => {
    cx_data.settings = settings;
    cx_data.root = root;

    await waitForElm(() => {
        const container = document.querySelector("#cx-ide .split-view-container")?.children;
        const left_tabs = container?.[0];
        const left_panel = container?.[1];
        const right_panel = container?.[3];
        const right_tabs = container?.[4];

        if (!left_tabs || !left_panel || !right_panel || !right_tabs)
            return false;

        const main_container = container?.[2].querySelector(".split-view-container")?.children;

        const editor_surface = main_container?.[0];
        const lower_panel = main_container?.[1];
        const lower_tabs = main_container?.[2];

        if (!editor_surface || !lower_panel || !lower_tabs)
            return false;

    cx_data.containers = {
            left_tabs,
            left_panel,
            editor_surface,
            lower_panel,
            lower_tabs,
            right_panel,
            right_tabs,
    }

        return true;
    });

    const terminal_key = Object.keys(cx_data.containers.lower_panel).find(key => key.startsWith('__reactFiber$'));
    if (terminal_key)
        cx_data.terminal = (cx_data.containers.lower_panel as any)[terminal_key].child.updateQueue.lastEffect.deps[0];

    await waitForElm(() => {
        const io_holder = document.querySelector('[data-test="ide-info-panel"]')?.lastChild;
        if (io_holder) {
            const io_key = Object.keys(io_holder).find(key => key.startsWith('__reactFiber$'));
            if (io_key)
                cx_data.io = (io_holder as any)[io_key].return.updateQueue.lastEffect.deps[0];

            return true;
        }

        return false
    });

    handlers = [
        new ShortcutsHandler(),
        new OptionsHandler(),
        new KeybindsHandler(),
        new LSPHandler(),
    ];

    for (const handler of handlers) {
        await handler.onLoad?.();
    }

    if (document.querySelector('#ace-editor')) editorLoaded();
    document.addEventListener("cxAceMounted", editorLoaded, { capture: true });

    if (CX_DEBUG) console.log('CX: Successfully injected script');
}));

onMessage('settings', (settings) => appendTask(async () => {
    const oldSettings = cx_data.settings;
    cx_data.settings = settings;

    for (const handler of handlers) {
        await handler.onUpdate?.(oldSettings);
    }
}));

onMessage('unload', () => appendTask(async () => {
    document.removeEventListener("cxAceMounted", editorLoaded, { capture: true });

    for (const handler of handlers) {
        await handler.onUnload?.();
    }

    handlers = [];

    if (CX_DEBUG) console.log('CX: Successfully unloaded script');
}));

sendMessage('ready');