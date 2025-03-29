export function applyDefaultSettings(settings : Settings) : Settings {
    const defaultSettings : Settings = {
        keybind: "default",
        vimrc: "",
        lsp: undefined,
        options: {
            goto_file: {
                index: 2,
                description: "Click link to go to file",
                value: true,
            },
            fix_xterm_scrollbar: {
                index: 3,
                description: "Fix scrollbar in Firefox",
                value: true,
            },
            parse_errors: {
                index: 4,
                description: "Parse and Display Errors",
                value: true,
            },
            navigable_filetree: {
                index: 5,
                description: "Makes FileTree Keyboard Navigable",
                value: true,
            }
        },
        shortcuts: {
            compile: {
                index: 0,
                short_description: "Compile",
                description: "Focuses the Terminal and hits the Compile button",
                value: undefined,
                modifiers: 0,
            },
            run: {
                index: 1,
                short_description: "Run",
                description: "Focuses the Terminal and hits the Run button",
                value: undefined,
                modifiers: 0,
            },
            test: {
                index: 2,
                short_description: "Run Tests",
                description: "Focuses the Terminal and hits the Test button",
                value: undefined,
                modifiers: 0,
            },
            format: {
                index: 3,
                short_description: "Format File",
                description: "Formats the currently open File using ACE's beautify extension",
                value: undefined,
                modifiers: 0,
            },
            line_comment: {
                index: 4,
                short_description: "Comment Selection",
                description: "Toggles the Comments on the currently selected Lines",
                value: undefined,
                modifiers: 0,
            },
            next_suggestion: {
                index: 5,
                short_description: "Next Suggestion",
                description: "Selects the next Suggestion in AutoComplete Popup",
                value: undefined,
                modifiers: 0,
            },
            previous_suggestion: {
                index: 6,
                short_description: "Previous Suggestion",
                description: "Selects the next Suggestion in AutoComplete Popup",
                value: undefined,
                modifiers: 0,
            },
            focusleft: {
                index: 7,
                short_description: "Focus left",
                description: "Focuses the Tab to the left of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusright: {
                index: 8,
                short_description: "Focus right",
                description: "Focuses the Tab to the right of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusup: {
                index: 9,
                short_description: "Focus top",
                description: "Focuses the Tab to the top of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusdown: {
                index: 10,
                short_description: "Focus bottom",
                description: "Focuses the Tab to the bottom of the current Tab",
                value: undefined,
                modifiers: 0,
            },
            focusfiletree: {
                index: 11,
                short_description: "Focus FileTree",
                description: "Opens and Focuses the FileTree Tab, so you can use Arrows (or hjkl in Vim mode) to navigate the files",
                value: undefined,
                modifiers: 0,
            },
            focuseditor: {
                index: 12,
                short_description: "Focus Editor",
                description: "Focuses the ACE Editor",
                value: undefined,
                modifiers: 0,
            },
            focusterminal: {
                index: 13,
                short_description: "Focus Terminal",
                description: "Opens and Focuses the Terminal",
                value: undefined,
                modifiers: 0,
            },
            focustask: {
                index: 14,
                short_description: "Focus Task",
                description: "Opens and Focuses the Tak or History Tab",
                value: undefined,
                modifiers: 0,
            },
        },
    }

    if (!settings)
        return defaultSettings;

    const _settings = settings as Record<string, any>;
    const _defaultSettings = defaultSettings as Record<string, any>;
    for (const setting in _defaultSettings) {
        if (!_settings[setting]) {
            _settings[setting] = _defaultSettings[setting];
        } else {
            if (typeof _defaultSettings[setting] === 'object') {
                for (const id in _defaultSettings[setting]) {
                    if (!_settings[setting][id])
                        _settings[setting][id] = _defaultSettings[setting][id];
                    else {
                        for (const key in _defaultSettings[setting][id]) {
                            if (key !== 'value' && key !== 'modifiers') {
                                _settings[setting][id][key] = _defaultSettings[setting][id][key];
                            }
                        }
                    }
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