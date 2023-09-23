#!/usr/bin/env python
from http import server

class MyHTTPRequestHandler(server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs) -> None:
        return super().__init__(*args, **kwargs, directory="./web");

    def end_headers(self):
        self.send_my_headers()
        super().end_headers()

    def send_my_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')


if __name__ == '__main__':
    serv = server.HTTPServer(('127.0.0.1', 8000), MyHTTPRequestHandler)
    serv.serve_forever()
