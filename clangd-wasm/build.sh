em++ src/test.cpp src/wrap-io.cpp -o web/test-em.js \
    -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='$stringToNewUTF8' \
    -sASYNCIFY -pthread -sPROXY_TO_PTHREAD -sEXIT_RUNTIME=1 \
    -Wl,--wrap=fgets,--wrap=fread \
    --pre-js web/settings.js
