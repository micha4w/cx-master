import type { KeyboardModifiers } from "$lib/KeyboardModifiers";

declare global {
	interface Option {
		description: string;
		value: boolean;
	}

	interface KeyboardShortcut {
		short_description: string;
		description: string;
		value: string | undefined;
		modifiers: KeyboardModifiers;
	}

	type KeyBindingsID = "default" | "vim" | "vscode" | "emacs" | "sublime";
	interface Settings {
		keybind: KeyBindingsID;
		vimrc: string;
		options: Record<string, Option>;
		shortcuts: Record<string, KeyboardShortcut>;
	}

	interface ISettingsHandler {
		onLoad?(settings : Settings);
		onUpdate?(settings : Settings);
		onUnload?();
	}
}

// import type Ace from 'ace-builds/ace.d.ts'
// declare module 'ace-builds/src-min-noconflict/ace' {
// 	ace: Ace;
// };

export { };
