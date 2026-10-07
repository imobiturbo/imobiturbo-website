const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {render} = require('../os-crm/v2/render.cjs');
const root = path.join(__dirname, '..');
const origin = 'https://os.imobiturbo.com.br';

async function worker() {
  const source = fs.readFileSync(path.join(root, 'workers/os-landing.js'), 'utf8');
  return (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
}

test('produção tem canonical próprio, indexação da LP e links legais oficiais', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'os-production-'));
  t.after(() => fs.rmSync(output, {recursive:true,force:true}));
  render(output, {productionOrigin:origin});
  const landing = fs.readFileSync(path.join(output,'index.html'),'utf8');
  const checkout = fs.readFileSync(path.join(output,'assinatura/index.html'),'utf8');
  assert.ok(landing.includes('<meta name="robots" content="index,follow">'));
  assert.ok(landing.includes(`<link rel="canonical" href="${origin}/">`));
  assert.ok(landing.includes(`<meta property="og:image" content="${origin}/os-crm/v2/assets/hero-current-desktop.webp">`));
  assert.ok(landing.includes('href="/os-crm/v2/favicon.svg"'));
  assert.ok(landing.includes('href="https://www.imobiturbo.com.br/termos-de-servico/"'));
  assert.ok(checkout.includes('<meta name="robots" content="noindex,nofollow">'));
  assert.ok(checkout.includes('https://os.imobiturbo.com.br/login'));
});

test('a LP é servida também com UTMs, sem descartar a query', async () => {
  const handler = await worker();
  const request = new Request(origin+'/?utm_source=meta&imt_audit=1');
  let seen;
  const response = await handler.fetch(request, {RELEASE_SHA:'release-fixture',ASSETS:{fetch: async r=>{seen=r;return new Response('LP',{headers:{'content-type':'text/html'}});}}});
  assert.equal(seen, request);
  assert.equal(await response.text(),'LP');
  assert.equal(response.headers.get('X-Imobiturbo-LP-Release'),'release-fixture');
});

test('login e APIs seguem à origem com método e headers intactos', async t => {
  const handler = await worker();
  for (const route of ['/login?next=%2Fapp','/api/v1/example','/app','/_next/static/test.js','/legal/google-calendar']) {
    const request = new Request(origin+route, {method:route.startsWith('/api/')?'POST':'GET',headers:{cookie:'fixture=session'}});
    const upstream = new Response('origem',{headers:{'x-origin-fixture':'yes'}});
    const mocked=t.mock.method(globalThis,'fetch',async r=>{assert.equal(r,request);return upstream;});
    const result = await handler.fetch(request,{ASSETS:{fetch:()=>{throw new Error('não pode encaminhar o app para assets');}}});
    assert.equal(result,upstream);
    mocked.mock.restore();
  }
});

test('mídia preserva byte ranges e a resposta parcial', async () => {
  const handler = await worker();
  const request = new Request(origin+'/os-crm/v2/assets/hero-current-mobile-phone.mp4',{headers:{range:'bytes=0-99'}});
  const response = await handler.fetch(request,{ASSETS:{fetch:async r=>{assert.equal(r.headers.get('range'),'bytes=0-99');return new Response('partial',{status:206,headers:{'content-range':'bytes 0-99/1000'}});}}});
  assert.equal(response.status,206);
  assert.equal(response.headers.get('content-range'),'bytes 0-99/1000');
  assert.equal(await response.text(),'partial');
});

test('vídeos retornam somente o trecho pedido quando o binding responde com o arquivo inteiro', async () => {
  const handler = await worker();
  const cases = [['bytes=2-6','23456','bytes 2-6/10'],['bytes=7-','789','bytes 7-9/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-99','89','bytes 8-9/10']];
  for (const [range, expected, contentRange] of cases) {
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) { for (const chunk of ['012','345','678','9']) controller.enqueue(new TextEncoder().encode(chunk)); },
      cancel() { cancelled = true; },
    });
    const response = await handler.fetch(new Request(origin+'/os-crm/v2/assets/proof.mp4',{headers:{range}}),{ASSETS:{fetch:async()=>new Response(body,{headers:{'content-type':'video/mp4','content-length':'10',etag:'"fixture"'}})}});
    assert.equal(response.status,206);
    assert.equal(response.headers.get('content-range'),contentRange);
    assert.equal(response.headers.get('content-length'),String(expected.length));
    assert.equal(await response.text(),expected);
    assert.equal(cancelled,true);
  }
});

test('ranges inválidos e If-Range divergente preservam o protocolo de vídeo', async () => {
  const handler = await worker();
  const assets={fetch:async()=>new Response('0123456789',{headers:{'content-type':'video/mp4','content-length':'10',etag:'"fixture"'}})};
  for (const range of ['bytes=10-20','bytes=7-2','bytes=-0']) {
    const response=await handler.fetch(new Request(origin+'/os-crm/v2/assets/proof.mp4',{headers:{range}}),{ASSETS:assets});
    assert.equal(response.status,416);
    assert.equal(response.headers.get('content-range'),'bytes */10');
    assert.equal(await response.text(),'');
  }
  for (const headers of [{range:'bytes=1-2','if-range':'"old"'},{range:'bytes=1-2,4-5'}]) {
    const response=await handler.fetch(new Request(origin+'/os-crm/v2/assets/proof.mp4',{headers}),{ASSETS:assets});
    assert.equal(response.status,200);
    assert.equal(await response.text(),'0123456789');
  }
  const response=await handler.fetch(new Request(origin+'/os-crm/v2/assets/proof.mp4',{headers:{range:'bytes=1-2','if-range':'"fixture"'}}),{ASSETS:assets});
  assert.equal(response.status,206);
  assert.equal(await response.text(),'12');
});

test('range usa o tamanho gerado no build quando o Cloudflare omite Content-Length no binding', async () => {
  const handler = await worker();
  const response=await handler.fetch(new Request(origin+'/os-crm/v2/assets/proof.mp4',{headers:{range:'bytes=2-4'}}),{ASSETS:{fetch:async()=>new Response('0123456789',{headers:{'content-type':'video/mp4','X-Imobiturbo-Media-Length':'10'}})}});
  assert.equal(response.status,206);
  assert.equal(response.headers.get('content-range'),'bytes 2-4/10');
  assert.equal(response.headers.get('content-length'),'3');
  assert.equal(response.headers.has('X-Imobiturbo-Media-Length'),false);
  assert.equal(await response.text(),'234');
});

test('endereço da versão de revisão redireciona à raiz preservando auditoria', async () => {
  const handler = await worker();
  const response = await handler.fetch(new Request(origin+'/os-crm/v2/?imt_audit=1&utm_source=meta'),{});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),origin+'/?imt_audit=1&utm_source=meta');
});

test('artefato de produção contém todos os recursos da LP e não inclui as outras páginas', t => {
  const {build} = require('../scripts/build-os-landing.cjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(),'os-landing-assets-'));
  t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
  build(output);
  for (const file of ['index.html','os-crm/v2/assinatura/index.html']) {
    const html=fs.readFileSync(path.join(output,file),'utf8');
    for (const match of html.matchAll(/(?:src|href|poster)="(\/os-crm\/v2\/[^"?#]+)"/g)) {
      assert.ok(fs.existsSync(path.join(output,match[1])),match[1]);
    }
  }
  assert.equal(fs.existsSync(path.join(output,'os-crm/v2/render.cjs')),false);
  assert.equal(fs.existsSync(path.join(output,'vagas')),false);
  assert.ok(fs.readFileSync(path.join(output,'_headers'),'utf8').includes('connect-src \'self\' https://track.nmidigital.tech'));
  const video='/os-crm/v2/assets/hero-current-mobile-phone.mp4';
  assert.ok(fs.readFileSync(path.join(output,'_headers'),'utf8').includes(`${video}\n  X-Imobiturbo-Media-Length: ${fs.statSync(path.join(output,video)).size}`));
});
