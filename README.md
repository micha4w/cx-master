# cx-master
This extension adds cool stuff like a nice switch between Vim, VSCode and Ace keybindings.

<img alt='settings' src='res/settings.png' width='400'>


## Extension
All the web Extension code is currently inside the `extension/` directory.

### Installing
> [!NOTE]
> This extension won't be available on Browsers addon sites, because:
> - `addons.mozilla.org`: Stupid verification proccess which I probably wont pass, because the testers can't test the addon without credentials. Plus I couldn't even get the addon far enough to get tested
> - `chromewebstore.google.com`: You need to pay 5$ to submit addons, can't endorse that


#### Firefox
Go to [Releases](https://github.com/micha4w/cx-master/releases) page and download the latest `.xpi` file, it should install and update automagically.

#### Chromium-Based Browsers
1. Go to [Releases](https://github.com/micha4w/cx-master/releases) page and download the latest `.zip`, then unpack it somewhere safe (If you delete the folder, the extension will uninstall)
2. Open [`chrome://extensions`](chrome://extensions) in your browser, flick the `Developer Mode` Switch (probably at the top right)
3. Click `Load unpacked` and choose the folder you just unpacked
4. Profit! *You can now undo Developer Mode if you want to*

> [!NOTE]
> Chromium won't automatically update the addon, because it wants my money,
> so if you wan't to keep up to date, Watch this repo and reinstall the addon when new versions come out


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


## [WIP] cx-lsp
This extension wants to some day add the clangd lsp to CodeExperts Ace Editor using a locally ran WebSocket or a clangd compiled to WASM.

### Native application

Create `~/.mozilla/native-messaging-hosts/cx_lsp.json` with following content
```json
{
  "name": "cx_lsp",
  "description": "Bridge to connect Code Expert with a local C++ LSP",
  "path": "/home/micha4w/.local/scripts/cx_lsp",
  "type": "stdio",
  "allowed_extensions": ["cx-lsp@micha4w.ch"]
}
```

### Building clangd to WASM
Need docker installed
```sh
wget https://github.com/llvm/llvm-project/archive/refs/tags/llvmorg-16.0.6.tar.gz
tar xf llvmorg-16.0.6.tar.gz
```
Once it finished unpacking, copy `cx-master/clangd-wasm/src/wrap-io.cpp` and `cx-master/clangd-wasm/web/settings.js` into the unpacked folder.
Then you need to inject some Code at the very end of clangd's `CMakeLists.txt`, located at `./llvm-project-llvmorg-16.0.6/clang-tools-extra/clangd/CMakeLists.txt`
```cmake
if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set_target_properties(Engine PROPERTIES LINK_FLAGS "-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='$stringToNewUTF8' -sASYNCIFY -pthread -sPROXY_TO_PTHREAD -sEXIT_RUNTIME=1 -Wl,--wrap=fgets,--wrap=fread --pre-js=/src/settings.js")
    target_sources(clangDaemon PUBLIC /src/wrap-io.cpp)
endif()
``` 


```sh
THREADS=6
docker run \
  --rm \
  -v $(pwd)/llvm-project-llvmorg-16.0.6:/src \
  -u $(id -u):$(id -g) \
  -it \
  emscripten/emsdk \
  sh -c "
    cmake -S llvm -B build-host -DCMAKE_BUILD_TYPE=Release -DLLVM_ENABLE_PROJECTS='clang;clang-tools-extra' -Wno-dev
    cmake --build build-host --target clang-tblgen llvm-tblgen clang-tidy-confusable-chars-gen -j $THREADS

    CXXFLAGS='-Dwait4=__syscall_wait4' \
    LDFLAGS='-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=\$stringToNewUTF8 \
             -sASYNCIFY -pthread -sPROXY_TO_PTHREAD -sEXIT_RUNTIME=1 \
             -Wl,--wrap=fgets,--wrap=fread \
             --pre-js web/settings.js' \
    emcmake cmake -S llvm -B build -DCMAKE_BUILD_TYPE=Release -DLLVM_ENABLE_PROJECTS='clang;clang-tools-extra' -Wno-dev \
        -DLLVM_TABLEGEN=/src/build-host/bin/llvm-tblgen \
        -DCLANG_TABLEGEN=/src/build-host/bin/clang-tblgen \
        -DCLANG_TIDY_CONFUSABLE_CHARS_GEN=/src/build-host/bin/clang-tidy-confusable-chars-gen
    emmake cmake --build build --target clangd -j $THREADS
    "
```

### CORS
For now you need to remove the Content-Security-Policy Response Header when running the lsp
