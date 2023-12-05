import type { KeyboardModifiers } from "$lib/KeyboardModifiers";

declare global {
	var Meteor : any;

	
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
		onLoad?();
		onLoadEditor?();
		onUpdate?(oldSettings : Settings);
		onUnload?();
	}
}

export { };
