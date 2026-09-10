/* Zero-dependency local server. Vercel continues to serve the static repository. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function createServer(root = path.resolve(__dirname, '..')) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
  return http.createServer((request, response) => {
    let file;
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep) || pathname.split('/').some(segment => segment.startsWith('.'))) throw Error('Invalid path');
    } catch {
      response.writeHead(400).end('Invalid request');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(data);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log(`SiteQuant Pro: http://127.0.0.1:${port}`));
}
module.exports = { createServer };
