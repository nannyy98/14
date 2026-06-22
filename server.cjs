const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5173;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Parse URL and decode
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Sanitize: remove null bytes, normalize path
  pathname = pathname.replace(/\0/g, '');

  // Resolve and normalize
  let filePath = path.join(DIST, pathname);

  // CRITICAL: Verify resolved path is within DIST directory
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(DIST))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If path is a directory or doesn't exist, serve index.html (SPA fallback)
  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
