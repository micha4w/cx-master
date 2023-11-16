export function applyDefaultSettings(settings : Settings) : Settings {
    const defaultSettings : Settings = {
        keybind: "default",
        vimrc: "",
        options: {
            // TODO
            // enable_lsp: {
            //     description: "Enable ClangD LSP",
            //     value: false,
            // },
            // Cant detect autosave, might lead to a cycle of autosaving and formatting
            // format_on_save: {
            //     description: "Format current file on save",
            //     value: false,
            // },
            // Probably can't get xterm instance 
            // goto_file: {
            //     description: "Click link to go to file",
            //     value: false,
            // },
            fix_xterm_scrollbar: {
                description: "Fix scrollbar in Firefox",
                value: true,
            }
        },
        shortcuts: {
            compile: {
                description: "Compile",
                value: undefined,
                modifiers: 0,
            },
            run: {
                description: "Run",
                value: undefined,
                modifiers: 0,
            },
            test: {
                description: "Run Tests",
                value: undefined,
                modifiers: 0,
            },
            format: {
                description: "Format file",
                value: undefined,
                modifiers: 0,
            },
            line_comment: {
                description: "Comment selection",
                value: undefined,
                modifiers: 0,
            },
            focusleft: {
                description: "Focus Tab to the Left",
                value: undefined,
                modifiers: 0,
            },
            focusright: {
                description: "Focus Tab to the Right",
                value: undefined,
                modifiers: 0,
            },
            focusup: {
                description: "Focus Tab to the Top",
                value: undefined,
                modifiers: 0,
            },
            focusdown: {
                description: "Focus Tab to the Bottom",
                value: undefined,
                modifiers: 0,
            },
            focusfiletree: {
                description: "Focus FileTree Tab",
                value: undefined,
                modifiers: 0,
            },
            focuseditor: {
                description: "Focus Editor Tab",
                value: undefined,
                modifiers: 0,
            },
            focusterminal: {
                description: "Focus Terminal Tab",
                value: undefined,
                modifiers: 0,
            },
            focustask: {
                description: "Focus Task Tab",
                value: undefined,
                modifiers: 0,
            },
        },
    };

    if (!settings)
        return defaultSettings;

    for (const setting in defaultSettings) {
        if (!settings[setting]) {
            settings[setting] = defaultSettings[setting];
        } else {
            if (typeof defaultSettings[setting] === 'object') {
                for (const id in defaultSettings[setting]) {
                    if (!settings[setting][id])
                        settings[setting][id] = defaultSettings[setting][id];
                }
            }
        }
    }

    return settings;
}

export function getKeyBindingins() : { id: KeyBindingsID; name: string }[] {
    return [
        {
            id: "vim",
            name: "Vi",
        },
        {
            id: "vscode",
            name: "VSCode",
        },
        {
            id: "emacs",
            name: "Emacs",
        },
        {
            id: "sublime",
            name: "Sublime",
        },
    ];
}