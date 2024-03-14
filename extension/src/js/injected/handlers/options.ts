import { cx_data, getCurrentFile, openFile, CachedBind } from '~/lib/Utils';
import { LinkProvider } from 'xterm-link-provider';
import type { IDisposable } from 'xterm';
import { ShortcutsHandler } from './shortcuts';

export class OptionsHandler extends CachedBind implements ISettingsHandler {
    documentObserver = new MutationObserver(this.handleDOMMutation.bind(this));
    linkProviderDisposer!: IDisposable;

    gotoAfterOpened!: [number, number];
    doneParsingCompilerOutput = false;
    compilerAnnotations = new Map<string, AceAjax.Annotation[]>();
    annotatedFiles = new Set<string>();


    private applySettings(decissionMaker: (option: string) => 'activate' | 'active' | 'removed' | 'remove', editorOnly = false) {
        const handleOptionChange = (options: string[], activate: () => void, remove: () => void) => {
            const decissions = options.map(decissionMaker);
            const wantActivate = decissions.some(dec => dec === 'activate');
            const wantRemove = decissions.some(dec => dec === 'remove');

            // This means either no change or change cancels out
            if (wantRemove == wantActivate)
                return;

            // Only activate if there were none active already
            // Only remove if there are no more active remaining
            if (!decissions.some(dec => dec === 'active')) {
                if (wantActivate) {
                    // console.log('activate ' + options);
                    activate()
                }
                else {
                    // console.log('remove ' + options);
                    remove();
                }
            }
        };

        if (!editorOnly) {
            handleOptionChange(
                ['fix_xterm_scrollbar'],
                () => {
                    for (const _node of document.head.children) {
                        const node = _node as HTMLElement;
                        if (node?.style?.width == '50000px') {
                            node.style.width = '0px';
                        }
                    }
                    this.documentObserver.observe(document.body, { childList: true });
                },
                () => this.documentObserver.disconnect(),
            );

            handleOptionChange(
                ['navigable_filetree'],
                () => {
                    const fileTree = document.querySelector('[data-test=project-tree-panel]') as HTMLElement;
                    if (!fileTree) return;

                    fileTree.setAttribute('tabindex', '-1'); // Makes the file tree focusable
                    fileTree.addEventListener('blur', this.cachedBind(this.handleFileTreeBlur));
                    fileTree.addEventListener('keydown', this.cachedBind(this.handleFileTreeKeyDown));

                    const style = document.createElement('style');
                    style.id = 'cxm-filetree-style';
                    style.textContent = `
                    .ant-tree-node-focused > .ant-tree-node-content-wrapper {
                        box-shadow: inset 0 0 0 1px lightgray;
                    }`;
                    document.head.append(style);
                },
                () => {
                    const fileTree = document.querySelector('[data-test=project-tree-panel]') as HTMLElement;
                    if (!fileTree) return;

                    fileTree.removeAttribute('tabindex');
                    fileTree.removeEventListener('blur', this.cachedBind(this.handleFileTreeBlur));
                    fileTree.removeEventListener('keydown', this.cachedBind(this.handleFileTreeKeyDown));
                    document.head.querySelector('#cxm-filetree-style')?.remove();
                },
            );

            if (cx_data.terminal) {
                handleOptionChange(
                    ['goto_file'],
                    () => this.linkProviderDisposer = cx_data.terminal!.registerLinkProvider(new LinkProvider(
                        cx_data.terminal!,
                        /(\/var\/lib\/cxrun\/projectfiles\/.*?:(?:\d+:){0,2})/,
                        this.handleFileLinkClicked.bind(this),
                    )),
                    () => this.linkProviderDisposer.dispose(),
                );

                const meteorSocket: WebSocket = Meteor?.connection?._stream?.socket;
                handleOptionChange(
                    ['parse_errors'],
                    () => meteorSocket?.addEventListener('message', this.cachedBind(this.handleMeteorResponse)),
                    () => {
                        meteorSocket?.removeEventListener('message', this.cachedBind(this.handleMeteorResponse));
                        this.compilerAnnotations.clear();
                        cx_data.editor?.session.clearAnnotations();
                        this.annotatedFiles.delete(getCurrentFile());
                    }
                );
            }
        }

        if (cx_data.editor) {
            if (cx_data.terminal) {
                handleOptionChange(
                    ['goto_file', 'parse_errors'],
                    () => { cx_data.editor!.addEventListener('changeSession', this.cachedBind(this.handleSessionChange)) },
                    () => {
                        // CX keeps the annotations for files, so we have to remove them all before we can actually remove the event Listener
                        if (this.annotatedFiles.size === 0) {
                            cx_data.editor!.removeEventListener('changeSession', this.cachedBind(this.handleSessionChange));
                            // console.log('Removed session change listener')
                        }
                    },
                );
            }
        }
    }

    onLoad() {
        this.applySettings((option) => cx_data.settings.options[option].value ? 'activate' : 'removed');
    }

    onLoadEditor() {
        this.applySettings((option) => {
            if (option === 'parse_errors' && this.annotatedFiles.size > 0)
                return 'activate';

            return cx_data.settings.options[option].value ? 'activate' : 'removed';
        }, true);
    }

    onUpdate(oldSettings: Settings) {
        this.applySettings((option) => {
            const oldValue = oldSettings.options[option].value;
            const newValue = cx_data.settings.options[option].value;

            if (oldValue === newValue) {
                if (newValue) {
                    return 'active';
                } else {
                    return 'removed';
                }
            } else {
                if (newValue) {
                    return 'activate';
                } else {
                    return 'remove';
                }
            }
        });
    }

    onUnload() {
        this.applySettings((option) => cx_data.settings.options[option].value ? 'remove' : 'active');
    }

    handleDOMMutation(recs: MutationRecord[]) {
        for (const rec of recs) {
            for (const _node of rec?.addedNodes) {
                const node = _node as HTMLElement;
                if (node?.style?.width == '50000px') {
                    node.style.width = '0px';
                }
            }
        }
    }

    handleMeteorResponse(e: MessageEvent) {
        const data = JSON.parse(e.data);
        if (data?.result?.stdout) {
            const stdout = (data.result.stdout as string).replaceAll(/\u001b\[.*?[a-zA-Z]/g, '');
            if (stdout === '<cx:end/>') {
                this.doneParsingCompilerOutput = true;
                return;
            }

            if (this.doneParsingCompilerOutput) {
                // New compile output
                this.doneParsingCompilerOutput = false;
                cx_data.editor!.session.clearAnnotations();
                this.compilerAnnotations.clear();
            }

            const matches = stdout.matchAll(/^\/var\/lib\/cxrun\/projectfiles\/(.*?):(\d+):(\d*):?\s+(?:fatal\s+)?(warning|error):\s+(.*)$/gm);
            while (true) {
                let { done, value: match } = matches.next();
                if (done) break;

                this.compilerAnnotations.set(match[1],
                    (this.compilerAnnotations.get(match[1]) || []).concat([{
                        text: match[5],
                        row: match[2] - 1,
                        column: match[3] - 1,
                        type: match[4],
                    }])
                );
                const file = getCurrentFile();
                if (this.compilerAnnotations.has(file)) {
                    cx_data.editor!.session.setAnnotations(this.compilerAnnotations.get(file)!);
                    this.annotatedFiles.add(file);
                }
            }
        }
    }

    handleSessionChange({ session }: Record<string, AceAjax.IEditSession>) {
        if (this.gotoAfterOpened)
            cx_data.editor!.gotoLine(...this.gotoAfterOpened);

        setTimeout(() => {
            const file = getCurrentFile();
            session.clearAnnotations();

            // Because CX stores annotations of files
            if (!cx_data.settings.options.parse_errors.value) {
                if (this.annotatedFiles.has(file)) {
                    this.annotatedFiles.delete(file);

                    if (this.annotatedFiles.size === 0 && !cx_data.settings.options.goto_file.value) {
                        cx_data.editor!.removeEventListener('changeSession', this.cachedBind(this.handleSessionChange));
                        // console.log('Removed session change listener')
                    }
                }
            } else {
                if (this.compilerAnnotations.has(file)) {
                    session.setAnnotations(this.compilerAnnotations.get(file)!);
                    this.annotatedFiles.add(file);
                }
            }
        }, 100); // To give brace enought time to set its own annotations, which would overwrite ours
    }

    handleFileTreeBlur(ev: FocusEvent) {
        document.querySelector('.ant-tree-node-focused')?.classList.remove('ant-tree-node-focused');
    }

    handleFileLinkClicked(e: MouseEvent, text: string) {
        const [file, line, column] = text.substring('/var/lib/cxrun/projectfiles/'.length).split(':');

        if (getCurrentFile() !== file) {
            openFile(file);
            if (line) this.gotoAfterOpened = [+line, +column - 1];
        } else {
            ShortcutsHandler.focusEditor();
            if (line) cx_data.editor!.gotoLine(+line, +column - 1);
        }
    }

    handleFileTreeKeyDown(e: KeyboardEvent) {
        if (!document.querySelector('[data-test=project-tree-panel]')?.contains(document.activeElement))
            return;

        if (!cx_data.settings.options.navigable_filetree)
            return;

        const fileTree = document.querySelector('.ant-tree-list-holder-inner')!;
        let focused = fileTree.querySelector('.ant-tree-node-focused')
            ?? fileTree.querySelector('.ant-tree-treenode-selected')
            ?? fileTree.children[0];
        const lastIndex = Array.prototype.indexOf.call(fileTree.children, focused);

        const isVim = cx_data.settings.keybind === 'vim';
        if (e.key == 'ArrowUp' || (isVim && e.key == 'k')) {
            if (lastIndex > 0) {
                focused.classList.remove('ant-tree-node-focused');
                fileTree.children[lastIndex - 1].classList.add('ant-tree-node-focused');
            }
        } else if (e.key == 'ArrowDown' || (isVim && e.key == 'j')) {
            if (lastIndex < fileTree.children.length - 1) {
                focused.classList.remove('ant-tree-node-focused');
                fileTree.children[lastIndex + 1].classList.add('ant-tree-node-focused');
            }
        } else if (e.key == 'Enter' || e.key == 'ArrowRight' || (isVim && e.key == 'l')) {
            (focused.querySelector('.ant-tree-node-content-wrapper') as HTMLElement).click();
        } else if (e.key == 'ArrowLeft' || (isVim && e.key == 'h')) {
            (focused.querySelector('.ant-tree-switcher') as HTMLElement).click();
        } else {
            // No keys matched, don't cancel Event
            return;
        }

        e.stopPropagation();
        e.preventDefault();
    }
}
