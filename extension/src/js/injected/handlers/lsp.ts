import { CachedBind, cx_data, getCurrentFile, onMessage, sendMessage } from '~/lib/Utils';
import { AceLanguageClient } from "ace-linters/build/ace-language-client";
import LSP from "vscode-languageserver-protocol/browser"

interface FileNode {
    key: string;
    originKey: string;
    children: FileNode[];
    isLeaf: boolean;
    root: boolean;
    path: string;
    title: string;
    type: string;
};

export class LSPHandler extends CachedBind implements ISettingsHandler {
    projectId!: string;
    root!: FileNode;
    directory!: string;
    fakeWorker!: { addEventListener: any, onmessage: any, postMessage: any };
    fileName!: string;

    async setupLSP() {
        if (!cx_data.lsp) {
            this.projectId = new URL(document.URL).pathname.split('/').at(-1)!;

            const files = await new Promise<{ tree: FileNode[] }>((resolve, reject) =>
                Meteor.connection.call("project_getProjectTree", {
                    "projectId": this.projectId,
                    "diffTree": false,
                    "role": "student"
                }, (error : Error, result : { tree: FileNode[] }) => {
                    if (error) reject(error);
                    else resolve(result);
                })
            );
            this.root = files.tree[0];

            const lspReady = new Promise<string>(res => onMessage('lsp-directory', res, true));

            sendMessage('lsp-start', cx_data.settings.lsp!.id);
            this.directory = (await lspReady).replaceAll('\\', '/');
            if (!this.directory.startsWith('/'))
                this.directory = '/' + this.directory;

            if (!cx_data.settings.lsp) return;

            const createFile = async (file: FileNode) => {
                if (file.isLeaf) {
                    const { content } = await new Promise<{ content: string } >((resolve, reject) =>
                        Meteor.connection.call("editor_getFileContent", {
                            "projectId": this.projectId,
                            "fileKey": file.key,
                        }, (error : Error, result : { content: string } ) => {
                            if (error) reject(error);
                            else resolve(result);
                        })
                    );
                    sendMessage('lsp-file', { path: file.path, content });
                } else {
                    await Promise.all(file.children.map(createFile));
                }
            }

            await createFile(this.root);
            if (!cx_data.settings.lsp) return;

            cx_data.lsp = AceLanguageClient.for({
                module: () => import("ace-linters/build/language-client"),
                modes: cx_data.settings.lsp!.mode,
                type: "webworker",
                worker: this.fakeWorker as Worker
            });
        }

        cx_data.lsp.registerEditor(cx_data.editor);
        // @ts-ignore
        this.fileName = cx_data.editor!.session.id + '.' + cx_data.editor!.session.getMode().$id.replace('ace/mode/', '');

        cx_data.editor!.on('changeSession', this.cachedBind(this.onSessionChange));
    }

    async onLoad() {
        onMessage('lsp-response', this.cachedBind(this.onLSPMessage));
        onMessage('lsp-error', (message) => { throw new Error(message); });

        this.fakeWorker = {
            postMessage: this.onAceMessage.bind(this),
            addEventListener: () => { },
            onmessage: undefined,
        };
    }

    async onLoadEditor() {
        if (cx_data.settings.lsp) {
            await this.setupLSP();
        }
    }

    async onUpdate(oldSettings: Settings) {
        if (cx_data.settings.lsp?.id !== oldSettings.lsp?.id) {
            if (cx_data.lsp) {
                sendMessage('lsp-stop');
                // TODO unload the editor
                if (cx_data.editor) {
                    cx_data.editor.off('changeSession', this.cachedBind(this.onSessionChange));
                    Object.values((cx_data.lsp as any).$sessionLanguageProviders).map((provider : any) => {
                        provider.session.doc.off("change", provider.$changeListener);
                        cx_data.lsp!.closeDocument(provider.session);
                    });
                }
                cx_data.lsp.dispose()
                cx_data.lsp = undefined;
            }

            if (cx_data.editor && cx_data.settings.lsp)
                await this.setupLSP();
        }
    }

    onUnload() {
        if (cx_data.lsp) {
            sendMessage('lsp-stop');
            if (cx_data.editor) {
                cx_data.editor.off('changeSession', this.cachedBind(this.onSessionChange));
                cx_data.lsp.closeDocument(cx_data.editor.session);
            }
            cx_data.lsp.dispose();
            cx_data.lsp = undefined;
        }
    }


    onSessionChange({ oldSession, session } : { oldSession : AceAjax.IEditSession , session: AceAjax.IEditSession }) {
        // cx_data.lsp?.closeDocument(oldSession);
        // @ts-ignore
        this.fileName = session.id + '.' + session.getMode().$id.replace('ace/mode/', '');
    }

    onAceMessage(message: LSP.RequestMessage) {
        if (message.method === 'initialize') {
            const params = message.params as LSP.InitializeParams;
            params.rootUri = 'file://' + this.directory;
        }
        if (message.method?.startsWith('textDocument/')) {
            (message.params as LSP.DidOpenTextDocumentParams).textDocument
                .uri = 'file://' + this.directory + '/' + getCurrentFile();

            if (message.method === 'textDocument/rangeFormatting') {
                const end = (message.params as LSP.DocumentRangeFormattingParams).range.end;
                if (end.character < 0) {
                    end.line -= 1;
                    end.character = cx_data.editor!.session.getLine(end.line).length + end.character;
                }
            }
        }

        sendMessage('lsp-request', JSON.stringify(message))
    }

    onLSPMessage(data: string) {
        const message = JSON.parse(data);

        if (message.error?.code === LSP.LSPErrorCodes.ContentModified) {
            return;
        }

        if (message.method === 'textDocument/publishDiagnostics') {
            // @ts-ignore
            (message.params as PublishDiagnosticsParams).uri = this.fileName;
        }

        this.fakeWorker.onmessage?.({ data: message });
    }
}