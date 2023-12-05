import { ShortcutsHandler } from './handlers/shortcuts';
import { OptionsHandler } from './handlers/options';
import { KeybindsHandler } from './handlers/keybinds';
import { cx_data } from '~/lib/Utils';

{
    const terminal_wrapper = document.querySelector('button[title=Compile]').closest('[data-testid=split-view-view]');
    const key = Object.keys(terminal_wrapper).find(key => key.startsWith('__reactFiber$'));
    cx_data.terminal = terminal_wrapper[key].child.updateQueue.lastEffect.deps[0];
}

const handlers: ISettingsHandler[] = [
    new ShortcutsHandler(),
    new OptionsHandler(),
    new KeybindsHandler(),
];

function editorLoaded() {
    cx_data.editor = ace.edit('ace-editor');
    for (const handler of handlers) {
        handler.onLoadEditor?.();
    }
}

window.addEventListener('message', async function (event) {
    if (event.source !== window || !event.data)
        return;

    const oldSettings = cx_data.settings;
    if (event.data.settings)
        cx_data.settings = event.data.settings;

    if (event.data.type === 'cxm-init') {
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
    }
});

window.postMessage({ type: 'cxm-ready' });