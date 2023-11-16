<script lang="ts">
    import {
        KeyboardModifiers,
        KeyboardModifierList,
        parseKeyEvent,
    } from "./KeyboardModifiers";

    export let value: string = "";
    export let modifiers: KeyboardModifiers = KeyboardModifiers.None;

    function keyPressed(e: KeyboardEvent) {
        if (KeyboardModifierList.find(({ mod }) => mod == e.key)) return;
        if (e.key == 'Backspace') {
            value = "";
            modifiers = KeyboardModifiers.None;
            return;
        }

        ({ value, modifiers } = parseKeyEvent(e));

        (document.activeElement as HTMLElement).blur();
    }
</script>

<input
    on:keydown|preventDefault={keyPressed}
    class:empty={!value}
    value={(() => {
        if (value) {
            const mods = KeyboardModifierList.filter(
                ({ id }) => modifiers & id
            ).map(({ mod }) => mod);

            mods.push(value);
            return mods.join(" + ");
        } else return "";
    })()}
/>

<style>
    input {
        all: unset;
        background-color: var(--primary-color);
        color: var(--text-inverted-color);
        border: 2px solid white;
        border-radius: 4px;
        text-align: center;
        width: 190px;
        height: 1.5em;
        font-size: 0.9em;
        caret-color: transparent;
        transition: 0.3s;
    }

    input.empty {
        background-color: var(--secondary-color);
    }
    
    input:focus {
        background-color: var(--primary-dark-color);
    }
</style>