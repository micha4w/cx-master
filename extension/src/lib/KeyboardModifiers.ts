export enum KeyboardModifiers {
    None = 0,
    Control = 1 << 0,
    Alt = 1 << 1,
    AltGraph = 1 << 2,
    Fn = 1 << 3,
    Hyper = 1 << 4,
    Meta = 1 << 5,
    // NumLock = 1 << 6,
    OS = 1 << 7,
    Super = 1 << 8,
    Shift = 1 << 9,
}

export const KeyboardModifierList = Object.entries(KeyboardModifiers)
    .filter(([mod, id]) => typeof id === "number")
    .map(([mod, id]) => { return { mod, id: id as KeyboardModifiers } });

export function parseKeyEvent(event: KeyboardEvent): { value: string, modifiers: KeyboardModifiers } {
    let value = event.key;

    let modifiers = KeyboardModifiers.None;
    for (const { mod, id } of KeyboardModifierList) {
        if (event.getModifierState(mod)) modifiers |= id;
    }

    if (event.code.startsWith("Key"))
        value = value.toUpperCase();
    // else
        // modifiers &= ~KeyboardModifiers.Shift;

    return { value, modifiers };
}
