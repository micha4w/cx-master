import 'ace-builds/src-min-noconflict/keybinding-vim';
import 'ace-builds/src-min-noconflict/keybinding-emacs';
import 'ace-builds/src-min-noconflict/keybinding-vscode';
import 'ace-builds/src-min-noconflict/keybinding-sublime';


export class KeybindsHandler implements ISettingsHandler {
    onLoad(settings: Settings) {
        this.onUpdate(settings)
    }

    onUpdate(settings: Settings) {
        const editor = ace.edit('ace-editor');

        switch (settings.keybind) {
            case 'default':
                editor.setKeyboardHandler('');
                break;
            case 'vim':
                const vim = ace.require('ace/keyboard/vim');
                editor.setKeyboardHandler(vim.handler);
                // vim.Vim.defineEx('gmap','gm', (cm, params) => {
                    // if (shortcutRunners[params.args[1]])
                    //     maps.push([params.args[0], params.args[1]]);
                // });
                for (const line of settings.vimrc.split('\n')) {
                    if (line.split(' ')[0] === 'map') {
                        // @ts-ignore
                        vim.Vim.handleEx(editor.state.cm, line);
                    }
                }
                break; 
            case 'emacs':
                editor.setKeyboardHandler(ace.require('ace/keyboard/emacs').handler);
                break; 
            case 'vscode':
                editor.setKeyboardHandler(ace.require('ace/keyboard/vscode').handler);
                break; 
            case 'sublime':
                editor.setKeyboardHandler(ace.require('ace/keyboard/sublime').handler);
                break; 
        }
    }
}