# cx-master
This extension adds cool stuff like a nice switch between Vim, VSCode and Ace keybindings.

![settings](res/settings.png)


## Extension
All the web Extension code is currently inside the `extension/` directory.

### Building
Requires npm
```sh
cd extension

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
Once it finished unpacking, you need to inject some Code into the CMakeLists.txt of Clangd, located at `./llvm-project-llvmorg-16.0.6/clang-tools-extra/clangd/CMakeLists.txt`

  1. Add `clangd-wasm/src/wrap-io.cpp`
  2. Set the linker / compile flags that are in the code block below (`CXXFLAGS` and `LDFLAGS`)

(It's possible that you have to set them only after the first `cmake --build` call, because otherwise cmake will complain, since it's a host build, you can also try with an `if (EMSCRIPTEN) add_target_source(...) set_linker_flag(...)`. Sadly I did a stupid and accidentaly rm -rf'ed the CMakeLists.tst that I got to work)

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
