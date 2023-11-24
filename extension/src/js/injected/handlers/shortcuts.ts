import { parseKeyEvent } from "~/lib/KeyboardModifiers";

export class ShortcutsHandler implements ISettingsHandler {
    settings: Settings;
    listener = this.handleKeyDown.bind(this);

    onLoad(settings: Settings) {
        this.settings = settings;
        const fileTree = document.querySelector('[data-test=project-tree-panel]') as HTMLElement;
        fileTree.setAttribute('tabindex', '-1'); // Makes the file tree focusable

        const style = document.createElement('style');
        style.textContent = `
        .ant-tree-node-focused > .ant-tree-node-content-wrapper {
            border: 1px solid white;
            box-sizing: border-box;
            border-radius: 2px;
        }
        `;
        document.head.append(style);

        document.body.addEventListener('keydown', this.listener, true);
    }

    onUpdate(settings: Settings) {
        this.settings = settings;
    }

    onUnload() {
        document.body.removeEventListener('keydown', this.listener);
    }


    static getFocused(): 'none' | 'filetree' | 'editor' | 'terminal' | 'task' {
        if (document.querySelector('[data-test=project-tree-panel]').contains(document.activeElement))
            return 'filetree';

        if (document.querySelector('[data-test=editor-panel]').contains(document.activeElement))
            return 'editor';

        if (document.querySelector('.terminal.xterm').contains(document.activeElement))
            return 'terminal';

        if (document.querySelector('.terminal.xterm').contains(document.activeElement))
            return 'terminal';

        if (document.querySelector('[data-test-id=ide-right-panel]').contains(document.activeElement))
            return 'terminal';

        return 'none';
    }

    static clickTab(label: string) {
        for (const el of document.querySelectorAll("[data-test=sp-tab]")) {
            if (el.textContent === label)
                (el as HTMLElement).click();
        }
    }

    static showTerminal() {
        if (!document.querySelector('.terminal.xterm'))
            this.clickTab('Console');
    }


    static runners = {
        focusleft: () => {
            switch (this.getFocused()) {
                case 'editor':
                case 'terminal':
                    this.runners.focusfiletree();
                    break;
                case 'task':
                    this.runners.focuseditor();
                    break;
            }
        },
        focusright: () => {
            switch (this.getFocused()) {
                case 'filetree':
                    this.runners.focuseditor();
                    break;
                case 'editor':
                case 'terminal':
                    this.runners.focustask();
                    break;
            }
        },
        focusup: () => {
            this.runners.focuseditor();
        },
        focusdown: () => {
            this.runners.focusterminal();
        },
        focusfiletree: () => {
            const tree = document.querySelector('[data-test=project-tree-panel]') as HTMLElement;
            if (tree.clientWidth == 0) {
                this.clickTab('Project file system');
            }

            tree.focus();
        },
        focuseditor: () => {
            ace.edit('ace-editor').focus();
        },
        focusterminal: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');
            else
                (document.querySelector('.xterm-helper-textarea') as HTMLElement).focus({ preventScroll: true });
        },
        focustask: () => {
            if (document.querySelector('[data-test-id=ide-right-panel]').clientWidth == 0)
                this.clickTab('Task');

            ((document.querySelector('[data-test=ide-description] [data-test=markdown-area]') ??
                document.querySelector('[data-test=ide-history] .is-display-block')) as HTMLElement).focus();
        },
        compile: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');
            else
                (document.querySelector('button[title=Compile]') as HTMLButtonElement).click();
        },
        run: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');
            else
                (document.querySelector('button[title=Run]') as HTMLButtonElement).click();
        },
        test: () => {
            if (!document.querySelector('.terminal.xterm'))
                this.clickTab('Console');
            else
                (document.querySelector('button[title=Test]') as HTMLButtonElement).click();
        },
        format: () => {
            const beautify = ace.require('ace/ext/beautify').beautify;
            beautify(ace.edit('ace-editor').getSession());
        },
        line_comment: () => {
            ace.edit('ace-editor').toggleCommentLines();
        },
    }

    lastIndex = 0;
    handleKeyDown(e: KeyboardEvent) {
        if (e.repeat) return false;

        const { value, modifiers } = parseKeyEvent(e);
        const ids = Object.keys(this.settings.shortcuts)
            .filter(id => value === this.settings.shortcuts[id].value && modifiers === this.settings.shortcuts[id].modifiers);

        if (ids.length > 0) {
            for (const id of ids) {
                ShortcutsHandler.runners[id]();
            }

            e.stopPropagation();
            e.preventDefault();
            return;
        }

        if (document.querySelector('[data-test=project-tree-panel]').contains(document.activeElement)) {
            if (this.handleFileTreeKeyDown(e)) {
                e.stopPropagation();
                e.preventDefault();
                return;
            }
        }
    }

    handleFileTreeKeyDown(e: KeyboardEvent): boolean {
        let focused = document.querySelector('.ant-tree-node-focused');
        if (!focused) {
            focused = document.querySelector('.ant-tree-node-selected')?.closest('.ant-tree-treenode');
        }
        let parent: HTMLElement;
        if (!focused) {
            parent = document.querySelector('.ant-tree-list-holder-inner');
            this.lastIndex = Math.min(this.lastIndex, parent.children.length - 1);
            focused = parent.children[this.lastIndex];
        } else {
            parent = focused.parentNode as HTMLElement;
            this.lastIndex = Array.prototype.indexOf.call(parent.children, focused);
        }

        const isVim = this.settings.keybind === 'vim';
        if (e.key == 'ArrowUp' || (isVim && e.key == 'k')) {
            if (this.lastIndex > 0) {
                focused.classList.remove('ant-tree-node-focused');
                parent.children[this.lastIndex - 1].classList.add('ant-tree-node-focused');
            }
        } else if (e.key == 'ArrowDown' || (isVim && e.key == 'j')) {
            if (this.lastIndex < parent.children.length - 1) {
                focused.classList.remove('ant-tree-node-focused');
                parent.children[this.lastIndex + 1].classList.add('ant-tree-node-focused');
            }
        } else if (e.key == 'Enter' || e.key == 'ArrowRight' || (isVim && e.key == 'l')) {
            focused.classList.remove('ant-tree-node-focused');
            (focused.querySelector('.ant-tree-node-content-wrapper') as HTMLElement).click();
        } else if (e.key == 'ArrowLeft' || (isVim && e.key == 'h')) {
            (focused.querySelector('.ant-tree-switcher') as HTMLElement).click();
        } else {
            return false;
        }

        return true;
    }
}