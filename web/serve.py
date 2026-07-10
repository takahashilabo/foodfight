#!/usr/bin/env python3
"""Static server for web/ that disables caching, so code updates during
development/venue setup always show up without a manual hard-reload."""
import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    http.server.test(HandlerClass=NoCacheHandler, port=8000)
