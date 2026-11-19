# -*- coding: utf-8 -*-
"""
本地模拟 Vercel cleanUrls 行为（仅供本地测试，线上以 vercel.json 为准）。

行为对照 vercel.json:
  - 访问 /basic-directory        -> 返回 basic-directory.html
  - 访问 /basic-directory.html  -> 308 跳转到 /basic-directory
  - 访问 /                       -> 返回 index.html
  - 其余 .js/.css/.png/.webp 等静态文件原样返回

用法：把本脚本放到站点根目录（和 index.html 同级），然后：
    python local_test_server.py 8000
浏览器打开 http://localhost:8000/
"""
import os
import sys
import re
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.gif': 'image/gif',
}

class CleanUrlsHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _decode(self, path):
        # 去掉 query string 并解码
        path = urllib.parse.urlparse(path).path
        return urllib.parse.unquote(path)

    def _resolve(self, rel):
        """把 URL 路径映射到磁盘文件；无后缀时尝试补 .html。"""
        rel = rel.lstrip('/')
        if rel == '':
            rel = 'index.html'
        disk = os.path.normpath(os.path.join(ROOT, rel))
        if os.path.isfile(disk):
            return disk
        # 无后缀：尝试补 .html
        if not os.path.splitext(disk)[1]:
            candidate = disk + '.html'
            if os.path.isfile(candidate):
                return candidate
        return None

    def do_GET(self):
        path = self._decode(self.path)

        # 模拟 cleanUrls：.html 后缀 308 到无后缀地址
        if path.endswith('.html'):
            target = path[:-5] or '/'
            query = urllib.parse.urlparse(self.path).query
            if query:
                target += '?' + query
            self.send_response(308)
            self.send_header('Location', target)
            self.end_headers()
            return

        disk = self._resolve(path)
        if disk and os.path.isfile(disk):
            ext = os.path.splitext(disk)[1].lower()
            ctype = MIME.get(ext, 'application/octet-stream')
            try:
                data = open(disk, 'rb').read()
                self.send_response(200)
                self.send_header('Content-Type', ctype)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except OSError:
                self.send_error(500, 'File read error')
            return

        self.send_error(404, 'Not Found: ' + path)

    def log_message(self, fmt, *args):
        sys.stdout.write('[local] %s\n' % (fmt % args))

if __name__ == '__main__':
    print('本地测试服务器（模拟 cleanUrls）已启动: http://localhost:%d/' % PORT)
    print('站点根目录:', ROOT)
    HTTPServer(('127.0.0.1', PORT), CleanUrlsHandler).serve_forever()
