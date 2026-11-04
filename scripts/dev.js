// 로컬 개발 서버: 정적 파일 + /api/nft 프록시를 Vercel과 같은 경로로 제공한다.
// 실행: npm run dev  →  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const nft = require('../api/nft.js');

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const m = u.pathname.match(/^\/api\/nft\/([A-Za-z]+)$/);
  if (m) {
    u.searchParams.set('method', m[1]);
    req.url = '/api/nft?' + u.searchParams.toString();
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { req.body = body; nft(req, res); });
    return;
  }
  let file = path.normalize(path.join(root, decodeURIComponent(u.pathname)));
  if (!file.startsWith(root) || /[\/](api|scripts|node_modules|\.)/.test(file.slice(root.length))) { res.statusCode = 404; return res.end('not found'); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Otherbridge dev server → http://localhost:${PORT}`);
  if (!process.env.ALCHEMY_API_KEY) console.log('※ ALCHEMY_API_KEY 없음: 공용 demo 키로 동작 (호출 제한 있음)');
});
