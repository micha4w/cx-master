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
                short_description: "Compile",
                description: "Focuses the Terminal and hits the Compile button",
                value: undefined,
                modifiers: 0,
            },
            run: {
                short_description: "Run",
                description: "Focuses the Terminal and hits the Run button",
                value: undefined,
                modifiers: 0,
            },
            test: {
                short_description: "Run Tests",
                description: "Focuses the Terminal and hits the Test button",
                value: undefined,
                modifiers: 0,
            },
            format: {
                short_description: "Format File",
                description: "Formats the currently open File using ACE's beautify extension",
                value: undefined,
                modifiers: 0,
            },
            line_comment: {
                short_description: "Comment Selection",
                description: "Toggles the Comments on the currently selected Lines",
                value: undefined,
                modifiers: 0,
            },
            focusleft: {
                short_description: "Focus left",
                description: "Focuses the Tab to the left of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusright: {
                short_description: "Focus right",
                description: "Focuses the Tab to the right of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusup: {
                short_description: "Focus top",
                description: "Focuses the Tab to the top of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusdown: {
                short_description: "Focus bottom",
                description: "Focuses the Tab to the bottom of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusfiletree: {
                short_description: "Focus FileTree",
                description: "Opens and Focuses the FileTree Tab, so you can use Arrows (or hjkl in Vim mode) to navigate the files",
                value: undefined,
                modifiers: 0,
            },
            focuseditor: {
                short_description: "Focus Editor",
                description: "Focuses the ACE Editor",
                value: undefined,
                modifiers: 0,
            },
            focusterminal: {
                short_description: "Focus Terminal",
                description: "Opens and Focuses the Terminal",
                value: undefined,
                modifiers: 0,
            },
            focustask: {
                short_description: "Focus Task",
                description: "Opens and Focuses the Tak or History Tab",
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