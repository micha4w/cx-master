import { parseKeyEvent } from "~/lib/KeyboardModifiers";
import { CachedBind, cx_data, waitForElm } from "~/lib/Utils";

export class ShortcutsHandler extends CachedBind implements ISettingsHandler {
    async onLoad() {
        document.body.addEventListener('keydown', this.cachedBind(this.handleKeyDown), true);
    }

    async onLoadEditor() {
        // @ts-ignore
        await import('ace-builds/src-min-noconflict/ext-beautify');
    }

    async onUnload() {
        document.body.removeEventListener('keydown', this.cachedBind(this.handleKeyDown), true);
    }

    handleKeyDown(e: KeyboardEvent) {
        if (e.repeat) return;

        const { value, modifiers } = parseKeyEvent(e);
        const ids = Object.keys(cx_data.settings.shortcuts)
            .filter(id => value === cx_data.settings.shortcuts[id].value && modifiers === cx_data.settings.shortcuts[id].modifiers);

        if (ids.length > 0) {
            ids.sort((a, b) => 
                cx_data.settings.shortcuts[a].index - cx_data.settings.shortcuts[b].index
            );
            for (const id of ids) {
                if (ShortcutsHandler.runners[id]()) {
                    break;
                }
            }

            e.stopPropagation();
            e.preventDefault();
        }
    }


    static getFocused(): 'none' | 'filetree' | 'editor' | 'terminal' | 'task' {
        if (cx_data.containers.left_panel.contains(document.activeElement))
            return 'filetree';

        if (cx_data.containers.editor_surface.contains(document.activeElement))
            return 'editor';

        if (cx_data.containers.lower_panel.contains(document.activeElement))
            return 'terminal';

        if (cx_data.containers.right_panel.contains(document.activeElement))
            return 'task';

        return 'none';
    }

    static revealTabByIcon(container: Element, icon: string) {
        if (!container.querySelector(`.is-selected-true [data-icon=${icon}]`))
            (container.querySelector(`[data-test=sp-tab] [data-icon=${icon}]`)!.closest('[data-test=sp-tab]') as HTMLElement)?.click();

        else if (container.querySelector('.tab-bar-collapsed'))
            this.toggleTabs(container);
    }

    static toggleTabs(container: Element) {
        (container.querySelector('.is-selected-true') as HTMLElement).click();
    }

    static focusFileTree() {
        if (cx_data.containers.left_tabs.querySelector('.tab-bar-collapsed'))
            this.toggleTabs(cx_data.containers.left_tabs);


        const tree = cx_data.containers.left_panel.querySelector('[data-test=project-tree-panel]') as HTMLElement;
        if (tree) {
            tree.focus();
            tree.querySelector('.ant-tree-treenode-selected')?.classList.add('ant-tree-node-focused');
        }
    }
    static focusEditor() {
        cx_data.editor?.focus();
    }
    static async focusTerminal() {
        if (cx_data.containers.lower_tabs.querySelector('.tab-bar-collapsed'))
            this.toggleTabs(cx_data.containers.lower_tabs);

        if (cx_data.containers.lower_tabs.querySelector('.is-selected-true [data-icon=terminal]')) {
            await waitForElm(() => !!cx_data.containers.lower_panel.querySelector('.terminal.xterm'));
            cx_data.terminal?.focus();
        }
    }
    static focusTask() {
        if (cx_data.containers.right_tabs.querySelector('.tab-bar-collapsed'))
            this.toggleTabs(cx_data.containers.right_tabs);

        ((cx_data.containers.right_panel.querySelector('[data-test=ide-description] [data-test=markdown-area]') ??
            cx_data.containers.right_panel.querySelector('[data-test=ide-history] .is-display-block')) as HTMLElement)?.focus();
    }
    static moveSuggestion(direction: 'up' | 'down') {
        // @ts-ignore
        const completer = cx_data.editor?.completer as any;
        if (completer?.getPopup?.()?.isOpen) {
            completer.getPopup().goTo?.(direction);
            return true;
        }
        
        return false;
    }



    static runners : Record<string, () => boolean | void> = {
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
                this.toggleTabs(cx_data.containers.left_tabs);
                this.focusEditor();
            } else {
                this.focusFileTree();
            }
        },
        focuseditor: () => {
            this.focusEditor();
        },
        focusterminal: () => {
            if (this.getFocused() === 'terminal') {
                this.toggleTabs(cx_data.containers.lower_tabs);
                this.focusEditor();
            } else {
                this.focusTerminal();
            }
        },
        focustask: () => {
            if (this.getFocused() === 'task') {
                this.toggleTabs(cx_data.containers.right_tabs);
                this.focusEditor();
            } else {
                this.focusTask();
            }
        },
        compile: () => {
            this.revealTabByIcon(cx_data.containers.lower_tabs, 'terminal');

            (cx_data.containers.lower_panel.querySelector('button[title=Compile]') as HTMLButtonElement)?.click();
        },
        run: () => {
            this.revealTabByIcon(cx_data.containers.lower_tabs, 'terminal');

            ((cx_data.containers.lower_panel.querySelector('button[title=Run]') ??
                cx_data.containers.lower_panel.querySelector('button[title=Stop]')) as HTMLButtonElement)?.click();
        },
        test: () => {
            if (cx_data.containers.lower_tabs.querySelector('[data-icon=flask]'))
                this.revealTabByIcon(cx_data.containers.lower_tabs, 'flask');
            else
                this.revealTabByIcon(cx_data.containers.lower_tabs, 'terminal');

            ((cx_data.containers.lower_panel.querySelector('button[title=Test]') ??
                cx_data.containers.lower_panel.querySelector('button[title=Stop]')) as HTMLButtonElement)?.click();
        },
        format: () => {
            if (!cx_data.editor)
                return;

            if (cx_data.lsp) {
                cx_data.lsp.format();
            } else {
                const beautify = ace.require('ace/ext/beautify').beautify;
                beautify(cx_data.editor.getSession());
            }
        },
        line_comment: () => {
            cx_data.editor?.toggleCommentLines();
        },
        next_suggestion: () => {
            return this.moveSuggestion('down');
        },
        previous_suggestion: () => {
            return this.moveSuggestion('up');
        },
    }
}