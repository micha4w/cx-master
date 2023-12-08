cmake_minimum_required(VERSION 3.5)

project(test)

add_executable(libTest
    src/test.cpp
    src/wrap-io.cpp
)

target_link_options(libTest
PUBLIC
    -sEXPORTED_RUNTIME_METHODS=stringToNewUTF8
    -sASYNCIFY
    -sEXIT_RUNTIME=1
    -sPROXY_TO_PTHREAD
    -sALLOW_MEMORY_GROWTH
    -pthread
    -Wl,--wrap=fgets,--wrap=fread
    --pre-js=/src/web/settings.js
)
