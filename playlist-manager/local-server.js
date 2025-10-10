// Simple HTTPS server for local development
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// For local development, we'll use HTTP since Spotify accepts http://localhost
const USE_HTTPS = false;
const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL and remove query params
  let filePath = req.url.split('?')[0];
  
  // Default to index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Construct full path
  const fullPath = path.join(__dirname, filePath);
  const extname = String(path.extname(fullPath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // Try to serve from parent directory (for firebase-config.js, images, etc.)
      const parentPath = path.join(__dirname, '..', filePath);
      fs.access(parentPath, fs.constants.F_OK, (err2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        
        fs.readFile(parentPath, (err3, content) => {
          if (err3) {
            res.writeHead(500);
            res.end('Error loading file');
          } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
          }
        });
      });
      return;
    }

    // Read and serve the file
    fs.readFile(fullPath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Sorry, there was an error: ' + error.code);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local development server running!`);
  console.log(`📍 URL: http://localhost:${PORT}/index.html`);
  console.log(`\n⚙️  Next steps:`);
  console.log(`1. Add this redirect URI to your Spotify app:`);
  console.log(`   http://localhost:${PORT}/playlist-manager/index.html`);
  console.log(`\n2. Open your browser to:`);
  console.log(`   http://localhost:${PORT}/index.html`);
  console.log(`\n3. Press Ctrl+C to stop the server\n`);
});
