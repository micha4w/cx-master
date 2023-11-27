# Extension

This is the extension part that currently only adds a few Shortcuts but might soon include an interface to a natively running Clangd instance.

## Building
Suggested to build on linux / wsl with node v20.5.1 and npm v9.8.0.
```js
npm run package
```

The generated Code will be in `dist/` and the packaged Zip will be in `out/`.