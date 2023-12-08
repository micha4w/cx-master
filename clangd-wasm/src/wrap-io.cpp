#include <iostream>
#include <string>

#include <memory.h>
#include <emscripten.h>


EM_ASYNC_JS(char*, _await_response, (), {
  self.postMessage({
    cmd: 'callHandler',
    handler: 'cx-get-message',
    args: [Module['_pthread_self']()]
  });

  _onmessage = self.onmessage;
  const input = await new Promise(res => {
    self.onmessage = e => {
      if (e.data.cmd === 'cx-message') {
          self.onmessage = _onmessage;
          res(e.data.message);
      } else {
        _onmessage(e);
      }
    }
  });

  // TODO stringToUTF8(str, ret, size);
  return stringToNewUTF8(input);
});

static char* s_Response = nullptr;
static bool s_GotLength = false;
extern "C" {
  extern char* __real_fgets(char* str, int num, FILE* stream);

  // Used to get Content-Length
  char* __wrap_fgets(char* str, int num, FILE* stream) {
    if (stream != stdin)
      return __real_fgets(str, num, stream);

    if (s_GotLength) {
      s_GotLength = false;
      std::cerr << std::endl;
      return strncpy(str, "\n", num);
    }

    s_GotLength = true;
    s_Response = _await_response();

    std::cerr << "Content-Length: " + std::to_string(strlen(s_Response)) << std::endl;
    return strncpy(str, ("Content-Length: " + std::to_string(strlen(s_Response)) + '\n').c_str(), num);
  }

  extern int __real_fread(char* str, int size, int num, FILE* stream);

  int __wrap_fread(char* str, int size, int num, FILE* stream) {
    if (stream != stdin)
      return __real_fread(str, size, num, stream);

    std::cerr << s_Response << std::endl;
    memcpy(str, s_Response, num);
    free(s_Response);
    return num;
  }
}
