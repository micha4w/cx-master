const worker: Worker = self as any

console.log("nice?");
self.postMessage()
self.onmessage = (msg) => {
    console.log(JSON.stringify(msg.data));
}
