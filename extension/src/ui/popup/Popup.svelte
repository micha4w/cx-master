<script lang="ts">
    import Switch from "~/ui/components/Switch.svelte";
    import Loader from "~/ui/components/Loader.svelte";
    import ShortcutInput from "~/ui/components/ShortcutInput.svelte";
    import logo from "~/assets/cxm-logo.svg";
    import { applyDefaultSettings, getKeyBindingins } from "~/lib/Settings";
    import browser from "webextension-polyfill";

    let settings: Settings;
    $: browser.storage.sync.set({ settings });
            const settingsPromise = (async () => {
        const vals = await browser.storage.sync.get("settings");
        settings = applyDefaultSettings(vals.settings);
    })();

    const keybinds = getKeyBindingins();
    const lspsPromise = browser.runtime.sendMessage({
        type: "list-lsps",
    }) as Promise<{ type: "lsp-entries", data: LSP[] }>;
</script>

<div class="logo-wrapper">
    <img src={logo} alt="CX-Logo" class="logo" />
</div>

{#await settingsPromise}
    <div class="section main-loader">
        <Loader></Loader>
    </div>
{:then _}
    <!-- <h1>Code Expert Addons</h1> -->
    <div class="section keybinds">
        <h3>KeyBindings</h3>
        <div class="flex-row">
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

    <div class="section lsps">
        <h3>LSP</h3>
        {#await lspsPromise}
            <Loader></Loader>
        {:then lsps}
            <div class="flex-row">
                {#each lsps.data as lsp}
                    <button
                        on:click={() => {
                            if (settings.lsp?.id === lsp?.id) {
                                settings.lsp = undefined;
                            } else {
                                settings.lsp = lsp;
                            }
                        }}
                        class:selected={settings.lsp?.id === lsp?.id}
                    >
                        {lsp.name}
                    </button>
                {/each}
            </div>
        {:catch error}
            <div>
                Failed to load LSP list from Native Executable, check out the
                <a
                    href="https://github.com/micha4w/cx-master?tab=readme-ov-file#cx-lsp"
                    >Readme</a
                >
                to see how to install LSPs.
                <details class="lsp-error">
                    <summary>Error</summary>
                    {error}
                </details>
            </div>
        {/await}
    </div>

    <div class="section options">
        <h3>Options</h3>
        {#each Object.keys(settings.options).sort((a, b) => settings.options[a].index - settings.options[b].index) as id}
            <div class="option">
                <span title={settings.options[id].description}
                    >{settings.options[id].description}</span
                >
                <div>
                    <Switch bind:value={settings.options[id].value} />
                </div>
            </div>
        {/each}
    </div>

    <div class="section shortcuts">
        <h3>Shortcuts</h3>
        {#each Object.keys(settings.shortcuts).sort((a, b) => settings.shortcuts[a].index - settings.shortcuts[b].index) as id}
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

    .flex-row {
        display: flex;
        gap: 5px;
    }

    .logo {
        width: 100%;
    }

    .logo-wrapper {
        display: flex;
        justify-content: center;
    }

    /* .main-loader {
        margin: 2em 0;
    } */

    .section {
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

    .lsps button,
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

    .lsps button.selected,
    .keybinds button.selected {
        background-color: var(--primary-color);
    }

    .lsp-error {
        border: 1px solid #aaa;
        border-radius: 4px;
        padding: 0.5em 0.5em 0;
        margin-top: 0.5em;
    }

    .lsp-error summary {
        margin: -0.5em -0.5em 0;
        padding: 0.5em;
    }

    .lsp-error[open] {
        padding: 0.5em;
    }

    .lsp-error[open] summary {
        border-bottom: 1px solid #aaa;
        margin-bottom: 0.5em;
    }

    .option {
        margin-bottom: 0.6em;
        display: flex;
        justify-content: space-between;
        gap: 0.5em;
    }

    .option span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
