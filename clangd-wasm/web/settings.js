(function() {
    const stdin = []
    let targetThreadId;

    function sendResponse(thread, message) {
        PThread.pthreads[thread].postMessage({ cmd: 'cx-message', message });
    }

    Module['cx-get-message'] = (_targetThreadId) => {
        console.info('shift', stdin)

        if (stdin.length > 0)
            sendResponse(_targetThreadId, stdin.shift());
        else
            targetThreadId = _targetThreadId;
    }

    self.onmessage = (msg) => {
        console.info('push', msg.data);

        if (targetThreadId !== undefined)
            sendResponse(targetThreadId, msg.data)
        else
            stdin.push(msg.data);
    }
})();


// _onmessage = self.onmessage
// const input = await Promise(res => {
//     self.onmessage = e => {
//         if (e.data.cmd === 'callback_input') {
//             self.onmessage = _onmessage;
//             res(e.data.input);
//         }
//     }
// });