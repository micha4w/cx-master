import type { KeyboardModifiers } from "./lib/KeyboardModifiers";

declare global {
	interface Option {
		index: number,
		description: string;
		value: boolean;
	}

	interface KeyboardShortcut {
		index: number,
		short_description: string;
		description: string;
		value: string | undefined;
		modifiers: KeyboardModifiers;
	}

	interface LSP {
		id: string,
		name: string,
		mode: string,
	}

	type KeyBindingsID = "default" | "vim" | "vscode" | "emacs" | "sublime";
	interface Settings {
		keybind: KeyBindingsID;
		lsp: LSP | undefined;
		vimrc: string;
		options: Record<string, Option>;
		shortcuts: Record<string, KeyboardShortcut>;
	}

	interface ISettingsHandler {
		onLoad?() : Promise<void>;
		onLoadEditor?() : Promise<void>;
		onUpdate?(oldSettings : Settings) : Promise<void>;
		onUnload?() : Promise<void>;
	}
}

export { };
