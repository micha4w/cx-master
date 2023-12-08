import { parseKeyEvent } from "~/lib/KeyboardModifiers";
import { CachedBind, cx_data, waitForElm } from "~/lib/Utils";

export class ShortcutsHandler extends CachedBind implements ISettingsHandler {
    onLoad() {
        document.body.addEventListener('keydown', this.cachedBind(this.handleKeyDown), true);
    }

    async onLoadEditor() {
        await import('ace-builds/src-min-noconflict/ext-beautify');
    }

    onUnload() {
        document.body.removeEventListener('keydown', this.cachedBind(this.handleKeyDown), true);
    }

    handleKeyDown(e: KeyboardEvent) {
        if (e.repeat) return;

        const { value, modifiers } = parseKeyEvent(e);
        const ids = Object.keys(cx_data.settings.shortcuts)
            .filter(id => value === cx_data.settings.shortcuts[id].value && modifiers === cx_data.settings.shortcuts[id].modifiers);

        if (ids.length > 0) {
            for (const id of ids) {
                ShortcutsHandler.runners[id]();
            }

            e.stopPropagation();
            e.preventDefault();
        }
    }


    static getFocused(): 'none' | 'filetree' | 'editor' | 'terminal' | 'task' {
        if (document.querySelector('[data-test=project-tree-panel]')?.contains(document.activeElement))
            return 'filetree';

        if (document.querySelector('[data-test=editor-panel]')?.contains(document.activeElement))
            return 'editor';

        if (document.querySelector('.terminal.xterm')?.contains(document.activeElement))
            return 'terminal';

        if (document.querySelector('.terminal.xterm')?.contains(document.activeElement))
            return 'terminal';

        if (document.querySelector('[data-test-id=ide-right-panel]')?.contains(document.activeElement))
            return 'terminal';

        return 'none';
    }

    static clickTab(label: string) {
        for (const el of document.querySelectorAll("[data-test=sp-tab]")) {
            if (el.textContent === label)
                (el as HTMLElement).click();
        }
    }

    static focusFileTree() {
        const tree = document.querySelector('[data-test=project-tree-panel]') as HTMLElement;
        if (tree.clientWidth == 0) {
            this.clickTab('Project file system');
        }

        tree.focus();
        tree.querySelector('.ant-tree-treenode-selected')?.classList.add('ant-tree-node-focused');
    }
    static focusEditor() {
        cx_data.editor?.focus();
    }
    static async focusTerminal() {
        if (!document.querySelector('.terminal.xterm'))
            this.clickTab('Console');
        
        await waitForElm(() => !!document.querySelector('.terminal.xterm'));
        cx_data.terminal.focus();
    }
    static focusTask() {
        if (document.querySelector('[data-test-id=ide-right-panel]').clientWidth == 0)
            this.clickTab('Task');

        ((document.querySelector('[data-test=ide-description] [data-test=markdown-area]') ??
            document.querySelector('[data-test=ide-history] .is-display-block')) as HTMLElement).focus();
    }



    static runners = {
        focusleft: () => {
            switch (this.getFocused()) {
                case 'editor':
                case 'terminal':
                    this.focusFileTree();
                    break;
                case 'task':
                    this.focusEditor();
                    break;
            }
        },
        focusright: () => {
            switch (this.getFocused()) {
                case 'filetree':
                    this.focusEditor();
                    break;
                case 'editor':
                case 'terminal':
                    this.focusTask();
                    break;
            }
        },
        focusup: () => {
            this.focusEditor();
        },
        focusdown: () => {
            this.focusTerminal();
        },
        focusfiletree: () => {
            if (this.getFocused() === 'filetree') {
                this.clickTab('Project file system');
                this.focusEditor();
            } else {
                this.focusTerminal();
            }
        },
        focuseditor: () => {
            this.focusEditor();
        },
        focusterminal: () => {
            if (this.getFocused() === 'terminal') {
                this.clickTab('Console');
                this.focusEditor();
            } else {
                this.focusTerminal();
            }
        },
        focustask: () => {
            if (this.getFocused() === 'task') {
                this.clickTab('Task');
                this.focusEditor();
            } else {
                this.focusTask();
            }
        },
        compile: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');

            (document.querySelector('button[title=Compile]') as HTMLButtonElement).click();
        },
        run: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');

            ((document.querySelector('button[title=Run]') ??
              document.querySelector('button[title=Stop]')) as HTMLButtonElement).click();
        },
        test: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');

            ((document.querySelector('button[title=Test]') ??
              document.querySelector('button[title=Stop]')) as HTMLButtonElement).click();
        },
        format: () => {
            if (!cx_data.editor)
                return;

            const beautify = ace.require('ace/ext/beautify').beautify;
            beautify(cx_data.editor.getSession());
        },
        line_comment: () => {
            cx_data.editor?.toggleCommentLines();
        },
    }
}