// Local VPS3 preview fixture. Never deployed or used as a payment endpoint.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../.cloudflare-pages');
let mode = 'ready';
let leadCalls = 0;
const server = http.createServer(async (req, res) => {
 const url = new URL(req.url, 'http://localhost');
 const json = (body,status=200) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 if(url.pathname === '/__fixture') {mode=url.searchParams.get('mode') || mode;return json({mode,leadCalls});}
 if(url.pathname === '/api/oficina/config') return json({checkoutUrl:mode === 'unavailable' ? null : 'https://www.asaas.com/c/oficina-fixture',price:47,datesConfirmed:true});
 if(url.pathname === '/api/oficina/lead') {
  leadCalls++;
  for await(const _ of req) {} // Consume synthetic test data without retaining it.
  return mode === 'error' ? json({ok:false},503) : json({ok:true,checkoutUrl:'https://www.asaas.com/c/oficina-fixture'});
 }
 let file = path.resolve(root, '.'+url.pathname);
 if(!file.startsWith(root+path.sep)) {res.writeHead(403);return res.end();}
 if(url.pathname.endsWith('/')) file=path.join(file,'index.html');
 try {const body=fs.readFileSync(file);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)] || 'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(body);} catch {res.writeHead(404);res.end('Not found');}
});
server.listen(4187,'127.0.0.1',()=>console.log('VPS3 fixture preview: 127.0.0.1:4187 (mock API; no payment)'));
