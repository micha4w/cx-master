<script lang="ts">
    import Switch from "~/ui/components/Switch.svelte";
    import Loader from "~/ui/components/Loader.svelte";
    import ShortcutInput from "~/ui/components/ShortcutInput.svelte";
    import logo from "~/assets/logo-inverted.svg";
    import { applyDefaultSettings, getKeyBindingins } from "~/lib/Settings";
    import browser from "webextension-polyfill";

    let settings: Settings;
    $: {
        browser.storage.sync.set({ settings });
        // browser.runtime.sendMessage(JSON.stringify(settings));
    }
    let settingsPromise = (async () => {
        const vals = await browser.storage.sync.get("settings");
        settings = applyDefaultSettings(vals.settings);
    })();

    const keybinds = getKeyBindingins();
</script>

<div class="logo-wrapper">
    <img src={logo} alt="CX-Logo" class="logo" />
</div>

{#await settingsPromise}
    <Loader></Loader>
{:then _}
    <!-- <h1>Code Expert Addons</h1> -->
    <div class="keybinds">
        <h3>KeyBindings</h3>
        <div class="keybind-flex">
            {#each keybinds as keybind}
                <button
                    on:click={() => {
                        if (settings.keybind === keybind.id) {
                            settings.keybind = "default";
                        } else {
                            settings.keybind = keybind.id;
                        }
                    }}
                    class:selected={settings.keybind === keybind.id}
                >
                    {keybind.name}
                </button>
            {/each}
        </div>
        {#if settings.keybind === "vim"}
            <textarea spellcheck="false" bind:value={settings.vimrc} />
        {/if}
    </div>

    <div class="options">
        <h3>Options</h3>
        {#each Object.keys(settings.options) as id}
            <div class="option">
                <span>{settings.options[id].description}</span>
                <div class="option-input">
                    <Switch bind:value={settings.options[id].value} />
                </div>
            </div>
        {/each}
    </div>

    <div class="shortcuts">
        <h3>Shortcuts</h3>
        {#each Object.keys(settings.shortcuts) as id}
            <div class="shortcut">
                <div
                    class="shortcut-label"
                    title="{settings.shortcuts[id]
                        .short_description}:&#10;&#13;{settings.shortcuts[id]
                        .description}"
                >
                    {settings.shortcuts[id].short_description}
                </div>
                <div>
                    <ShortcutInput
                        bind:value={settings.shortcuts[id].value}
                        bind:modifiers={settings.shortcuts[id].modifiers}
                    />
                </div>
            </div>
        {/each}
    </div>
{/await}

<style>
    * {
        color: var(--text-color);
    }

    .logo {
        width: 100%;
    }

    .logo-wrapper {
        display: flex;
        justify-content: center;
    }

    .options,
    .keybinds,
    .shortcuts {
        background-color: var(--secondary-background);
        border-radius: 4px;
        margin-top: 1em;
        padding: 1.25em;
        border: 2px solid var(--border-color);
    }

    h3 {
        margin: 0 0 1em 0;
        text-align: center;
        border: 0px solid var(--border-color);
        padding-bottom: 0.5em;
        border-bottom-width: 2px;
    }

    .option {
        margin-bottom: 0.6em;
    }

    .option-input {
        float: right;
    }

    .keybinds textarea {
        margin-top: 1em;
        width: 100%;
        resize: vertical;
        box-sizing: border-box;
        background-color: var(--primary-background);
        color: var(--text-color);
        font: monospace;
        border-radius: 0.3em;
        font-size: 1.1em;
        line-height: 1.5em;
        height: 10em;
        z-index: -1;
    }

    .keybind-flex {
        display: flex;
        gap: 5px;
    }

    .keybinds button {
        all: unset;
        background-color: var(--secondary-color);
        color: var(--text-inverted-color);
        border: 2px solid white;
        border-radius: 4px;
        text-align: center;
        width: 190px;
        height: 1.5em;
        font-size: 0.9em;
        caret-color: transparent;
        transition: 0.3s;
        flex: 1 0 0;
    }

    .keybinds button.selected {
        background-color: var(--primary-color);
    }

    .shortcut {
        margin-bottom: 0.8em;
        display: flex;
        justify-content: space-between;
        gap: 0.5em;
    }

    .shortcut-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
