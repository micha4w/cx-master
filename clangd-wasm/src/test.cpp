#include <stdio.h>

#include <string.h>
#include <string>


int main() {
  // clangd does stdin on main thread only
  std::string data;
  while (true) {
    char contentLength[100];
    fgets(contentLength, sizeof(contentLength), stdin);
    printf("got %s\n", contentLength);
    printf("yay %d", contentLength[strlen(contentLength) - 1]);

    size_t length = std::atoi(contentLength + 16);
    fgets(contentLength, sizeof(contentLength), stdin);
    printf("got2 %s\n", contentLength);
    printf("yay2 %d", contentLength[strlen(contentLength) - 1]);

    data.resize(length);
    fread(data.data(), 1, length, stdin);

    printf("json-rpc: %d, %s\n", (int) length, data.c_str());
  }
}
