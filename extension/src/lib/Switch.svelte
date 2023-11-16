<script lang="ts">
    export let value: boolean = false;
</script>

<button role="switch" aria-checked={value} on:click={_ => value = !value}/>

<style>
    button {
        width: 3em;
        height: 1.6em;
        position: relative;
        margin: 0 0 0 0.5em;
        background: var(--secondary-color);
        border: none;
        transition: 0.3s;
        border-radius: 1.5em;
    }

    button::before {
        content: '';
        position: absolute;
        width: 1.3em;
        height: 1.3em;
        background: white;
        top: 0.15em;
        right: 1.5em;
        transition: 0.3s;
        border-radius: 100%;
    }

    button[aria-checked='true']{
        background-color: var(--primary-color);
    }

    button[aria-checked='true']::before{
        transform: translateX(1.3em);
    }

    /* button:focus, button:hover  {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 1.5em;
    } */
</style>