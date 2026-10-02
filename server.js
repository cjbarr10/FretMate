// A static file server for local development. Node built-ins only — no
// dependencies, no package.json, nothing to install.
//
//   node server.js          -> http://localhost:3000
//   node server.js 8080     -> http://localhost:8080
//
// Reads are synchronous on purpose: this serves a handful of small files to one
// person on their own machine, and it keeps the whole thing readable top to
// bottom.

'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var PORT = Number(process.argv[2] || process.env.PORT || 3000);

var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function contentType(filePath) {
  return TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Resolve a URL to a file inside ROOT, or null if it points anywhere else.
// Without this check a request for /../../.ssh/id_rsa would be served happily.
function resolve(urlPath) {
  var decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch (err) {
    return null; // malformed percent-encoding
  }

  if (decoded === '/' || decoded === '') decoded = '/index.html';

  var full = path.join(ROOT, path.normalize(decoded));
  if (full !== ROOT && full.indexOf(ROOT + path.sep) !== 0) return null;
  return full;
}

var server = http.createServer(function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  var filePath = resolve(req.url);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  var body;
  try {
    body = fs.readFileSync(filePath);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + req.url);
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': body.length,
    // this is a dev server; always serve what's on disk right now
    'Cache-Control': 'no-store',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use. Try: node server.js 3001');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, function () {
  console.log('FretMate running at http://localhost:' + PORT);
  console.log('Press Ctrl+C to stop.');
});
