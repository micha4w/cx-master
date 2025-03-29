import { cx_data } from '~/lib/Utils';

export class KeybindsHandler implements ISettingsHandler {
    async onLoadEditor() {
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
                // @ts-ignore
                await import('ace-builds/src-min-noconflict/keybinding-vim');
                const vim = ace.require('ace/keyboard/vim');
                cx_data.editor.setKeyboardHandler(vim.handler);
                vim.Vim.defineEx('hover', '', (cm : any, params : any) => {
                    const provider = cx_data.lsp as any;
                    if (!provider?.$hoverTooltip)
                        return;

                    const event = { getDocumentPosition: () => cx_data.editor!.getCursorPosition() };
                    provider.$hoverTooltip.lastEvent = event;
                    provider.$hoverTooltip.$gatherData(
                        event,
                        cx_data.editor
                    );
                });
                for (const line of cx_data.settings.vimrc.split('\n')) {
                    if (line.trim() !== '')
                        vim.Vim.handleEx((cx_data.editor as any).state.cm, line);
                }
                break;
            case 'emacs':
                // @ts-ignore
                await import('ace-builds/src-min-noconflict/keybinding-emacs');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/emacs').handler);
                break;
            case 'vscode':
                // @ts-ignore
                await import('ace-builds/src-min-noconflict/keybinding-vscode');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/vscode').handler);
                break;
            case 'sublime':
                // @ts-ignore
                await import('ace-builds/src-min-noconflict/keybinding-sublime');
                cx_data.editor.setKeyboardHandler(ace.require('ace/keyboard/sublime').handler);
                break;
        }
    }

    async onUnload() {
        cx_data.editor?.setKeyboardHandler('');
    }
}