<script lang="ts">
  import PageContent from "~/lib/PageContent.svelte";
</script>

<main>
  <h1>Code Expert Addons</h1>
  KeyBindings: <button>Ace</button><button>Vi</button><button>VSCode</button><button>Emacs</button>
  <br>
  LSP: <input type="checkbox" />
  <br>
  Run on Save: <input type="checkbox" />
  <br>
  Click link to go to file: <input type="checkbox" />
</main>

<style>
  main {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
  }
</style>
