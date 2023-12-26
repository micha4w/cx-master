# Extension

This is the extension part that currently only adds a few Shortcuts and Options but might soon include an interface to a natively running Clangd instance.

## Building
Suggested to build on linux / wsl with node v20.5.1 and npm v9.8.0.
```js
npm install
npm run package:firefox
```

The generated Code will be in `dist/` and the packaged Zip will be in `out/`.

## Notes to myself
To get the files of stuff:
```js
Meteor.connection.call("project_getProjectTree", {"projectId":"5XbLZfMfGPDNfeqLR","diffTree":false,"role":"student"}, console.log)

Meteor.connection.call("editor_getFileContent", {"projectId":"5XbLZfMfGPDNfeqLR","fileKey":"vwsZ7xhopFjRy8zJM", console.log)
["{\"msg\":\"method\",\"id\":\"24\",\"method\":\"editor_getFileContent\",\"params\":[{\"projectId\":\"Pbji3v8s8djkMmmvr\",\"fileKey\":\"vwsZ7xhopFjRy8zJM\",\"end\":131072}]}"]
```

