import { CachedBind, cx_data, getCurrentFile, onMessage, sendMessage } from '~/lib/Utils';
import { AceLanguageClient } from "ace-linters/build/ace-language-client";
import type { RequestMessage } from "vscode-jsonrpc/lib/common/messages"
import type { InitializeParams, DidOpenTextDocumentParams, DocumentRangeFormattingParams } from "vscode-languageserver-protocol/lib/common/protocol"
import type { LanguageProvider } from 'ace-linters/types/language-provider';

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
    projectId: string;
    root: FileNode;
    directory: string;
    fakeWorker: { addEventListener, onmessage, postMessage };
    provider: LanguageProvider;

    async setupProvider() {
        // if (!cx_data.settings.options['lsp'].value)
        //     return;
        this.projectId = new URL(document.URL).pathname.split('/').at(-1);

        const files: { tree: FileNode[] } = await new Promise((resolve, reject) =>
            Meteor.connection.call("project_getProjectTree", {
                "projectId": this.projectId,
                "diffTree": false,
                "role": "student"
            }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            })
        );
        this.root = files.tree[0];

        const clangdReady = new Promise<string>(res => onMessage('lsp-directory', res, true));
        sendMessage('lsp-start');
        this.directory = await clangdReady;

        const createFile = async (file: FileNode) => {
            if (file.isLeaf) {
                const { content }: { content: string } = await new Promise((resolve, reject) =>
                    Meteor.connection.call("editor_getFileContent", {
                        "projectId": this.projectId,
                        "fileKey": file.key,
                    }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    })
                );
                sendMessage('lsp-file', { path: file.path, content });
            } else {
                for (const child of file.children) {
                    await createFile(child);
                }
            }
        }

        await createFile(this.root);

        onMessage('lsp-response', this.cachedBind(this.onLSPMessage));

        this.fakeWorker = {
            postMessage: this.onAceMessage.bind(this),
            addEventListener: () => { },
            onmessage: undefined,
        };
        return AceLanguageClient.for({
            module: () => import("ace-linters/build/language-client"),
            modes: "c_cpp",
            type: "webworker",
            worker: this.fakeWorker as Worker
        });
    }

    async onLoadEditor() {
        if (cx_data.settings.options.lsp?.value) {
            cx_data.lsp = await this.setupProvider();
            cx_data.lsp.registerEditor(cx_data.editor);

            // Because async makes it so that code runs in wrong order
            cx_data.editor.on('changeSession', ({ oldSession, session }) => {
                cx_data.lsp?.closeDocument(oldSession);

                function $changeMode(e) {
                    console.log('mode', cx_data.editor.session.getMode());
                    // @ts-ignore
                    cx_data.lsp.$sessionLanguageProviders[cx_data.editor.session.id]?.$changeMode()

                    cx_data.editor.off('changeMode', $changeMode);
                }
                cx_data.editor.on('changeMode', $changeMode)
            });
        }
    }

    async onUpdate(oldSettings: Settings) {
        const oldValue = oldSettings.options.lsp?.value;
        const newValue = cx_data.settings.options.lsp?.value;
        if (!oldValue && newValue) {
            if (cx_data.editor) {
                cx_data.lsp = await this.setupProvider();
                cx_data.lsp.registerEditor(cx_data.editor);
            }
        } else if (oldValue && !newValue) {
            sendMessage('lsp-stop');
            cx_data.lsp.dispose();
            cx_data.lsp = undefined;
        }
    }

    onUnload() {
        if (cx_data.settings.options.lsp?.value)
            sendMessage('lsp-stop');
    }


    onAceMessage(message: RequestMessage) {
        // console.log('request', message)

        if (message.method === 'initialize') {
            const params = message.params as InitializeParams;
            params.rootUri = 'file://' + this.directory;
        }
        if (message.method.startsWith('textDocument/')) {
            (message.params as DidOpenTextDocumentParams).textDocument
                .uri = 'file://' + this.directory + '/' + getCurrentFile();

            if (message.method === 'textDocument/rangeFormatting') {
                const end = (message.params as DocumentRangeFormattingParams).range.end;
                if (end.character < 0) {
                    end.line -= 1;
                    end.character = cx_data.editor.session.getLine(end.line).length + end.character;
                }
            }
        }

        sendMessage('lsp-request', JSON.stringify(message))
    }

    onLSPMessage(message: string) {
        this.fakeWorker.onmessage({ data: JSON.parse(message) });
        // console.log('response', JSON.parse(message));
    }
}