# cx-master
This extension adds cool stuff like a nice switch between Vim, VSCode and Ace keybindings.

Sadly, it will probalby not be possible to put this on addons.mozilla.org, because they need access to CodeExpert to validate the extension.

## Extension
All the web Extension code is currently inside the `extension/` directory.

### Building
Requires npm
```sh
cd extension
npm run package
```
The generated Code will be in `dist/` and the packaged Zip will be in `out/`.


## [WIP] cx-lsp
This extension adds the clangd lsp to CodeExperts Ace Editor using a locally ran WebSocket.

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
Need emsdk installed
```sh
wget https://github.com/llvm/llvm-project/archive/refs/tags/llvmorg-16.0.6.tar.gz
tar xf llvmorg-16.0.6.tar.gz

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


em++ src/test.cpp -o web/test-em.js \
  -pthread -sPROXY_TO_PTHREAD -sASYNCIFY \
  -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='$stringToNewUTF8' \
  -Wl,--wrap=fgets,--wrap=fread
clang++ src/test.cpp -o test
```

### CORS
For now you need to remove the Content-Security-Policy Response Header when running the lsp
