# cx-master
This extension adds cool stuff like a nice switch between Vim, VSCode and Ace keybindings.

<img alt='settings' src='res/settings.png' width='400'>

## Extension
All the web Extension code is currently inside the `extension/` directory.
Code Expert uses `ace-builds` version 1.22.0 and `xterm` version `5.3.0` so when updating the package.json, make sure to keep these versions the same.

### Installing
#### Firefox
[Mozilla Addons](https://addons.mozilla.org/en-US/firefox/addon/code-expert-master/)

#### Chromium-Based Browsers
[Chrome WebStore](https://chromewebstore.google.com/detail/code-expert-master/fdmghidnemaceleocaolmgdkpegkhlcf)

### Building
Requires npm
```sh
cd extension
npm i

## One of
npm run package:firefox
npm run package:chrome
```
The generated Code will be in `dist/` and the packaged Zip will be in `out/`.


## cx-lsp
This Extension can connect to a Natively running LSP Server, but you need to have an Application installed.

### Native application
#### Automatic
**Windows:**
```ps1
Invoke-WebRequest "https://raw.githubusercontent.com/micha4w/cx-master/main/install.ps1" | Invoke-Expression
```

**Linux:**
```sh
bash <(curl -sS "https://raw.githubusercontent.com/micha4w/cx-master/main/install.sh")
```

### LSP Servers
You need to have the LSP servers that you want to use on CodeExpert installed on your PC.
For example to use the C++ Language Server (ClangD) you have to install it using:
```ps1
# Windows
winget install LLVM.clangd
# Debian / Ubuntu
sudo apt-get install clangd-12
```
More systems [here](https://clangd.llvm.org/installation.html)

For the Python LSP (PyRight) you need to have Python installed and then do:
```ps1
pip install pyright
# The libraries you want to use in CX need to be installed on your system
pip install numpy matplotlib scipy
```

#### Adding your own LSP Servers
If another language is added to CX, or you don't like the default LSPs, you can add your own by creating config files in `%APPDATA%\cx-master\lsps` on windows or `$XDG_DATA_DIR\cx-master\lsps` on linux. Check out the files that are already in the directory to see how it works.

To get the needed mode, open CX at the file you want to add an LSP for and run
```js
ace.edit('ace-editor').session.getMode().$id;
```
in the browser console, then take out the last part of the path (e.g. ace/mode/c_cpp -> c_cpp)
