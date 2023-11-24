import 'ace-builds/src-min-noconflict/ext-beautify';

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
        for (const handler of handlers) {
            handler.onLoad?.(event.data.settings);
        }
    }

    if (event.data.type === 'cxm-reload') {
        for (const handler of handlers) {
            handler.onUnload?.();
        }

        for (const handler of handlers) {
            handler.onLoad?.(event.data.settings);
        }
    }

    if (event.data.type === 'cxm-settings') {
        for (const handler of handlers) {
            handler.onUpdate?.(event.data.settings);
        }
    }

    // TODO unloading
});
window.postMessage({ type: 'cxm-ready' });