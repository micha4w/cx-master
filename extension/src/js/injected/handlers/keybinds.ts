import { cx_data } from '~/lib/Utils';

export class KeybindsHandler implements ISettingsHandler {
    onLoadEditor() {
        this.onUpdate({ keybind: 'default' } as Settings);
    }

    async onUpdate(oldSettings: Settings) {
        if (!cx_data.editor || oldSettings.keybind === cx_data.settings.keybind)
            return;

        switch (cx_data.settings.keybind) {
            case 'default':
                cx_data.editor.setKeyboardHandler('');
                break;
            case 'vim':
                await import('ace-builds/src-min-noconflict/keybinding-vim');
                const vim = ace.require('ace/keyboard/vim');
                cx_data.editor.setKeyboardHandler(vim.handler);
                // vim.Vim.defineEx('gmap','gm', (cm, params) => {
                // if (shortcutRunners[params.args[1]])
                //     maps.push([params.args[0], params.args[1]]);
                // });
                for (const line of cx_data.settings.vimrc.split('\n')) {
                    if (line.trim() !== '')
                        vim.Vim.handleEx((cx_data.editor as any).state.cm, line);
                }
                break;
            case 'emacs':
                await import('ace-builds/src-min-noconflict/keybinding-emacs');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/emacs').handler);
                break;
            case 'vscode':
                await import('ace-builds/src-min-noconflict/keybinding-vscode');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/vscode').handler);
                break;
            case 'sublime':
                await import('ace-builds/src-min-noconflict/keybinding-sublime');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/sublime').handler);
                break;
        }
    }

    onUnload() {
        cx_data.editor?.setKeyboardHandler('');
    }
}