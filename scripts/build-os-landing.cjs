const fs = require('node:fs');
const path = require('node:path');
const {render} = require('../os-crm/v2/render.cjs');
const root = path.join(__dirname, '..');

function build(output = path.join(root, '.cloudflare-os-landing')) {
  fs.rmSync(output, {recursive:true,force:true});
  const target = path.join(output, 'os-crm/v2');
  fs.mkdirSync(path.join(target, 'assinatura'), {recursive:true});
  for (const entry of ['assets','offer.js','lp.js','proof-player.js','tracking.js','assinatura/checkout.css','assinatura/checkout.js']) {
    fs.cpSync(path.join(root,'os-crm/v2',entry),path.join(target,entry),{recursive:true});
  }
  fs.copyFileSync(path.join(root,'favicon.svg'),path.join(target,'favicon.svg'));
  render(target,{productionOrigin:'https://os.imobiturbo.com.br'});
  fs.copyFileSync(path.join(target,'index.html'),path.join(output,'index.html'));
  const html = fs.readFileSync(path.join(output,'index.html'),'utf8');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  fs.writeFileSync(path.join(output,'_headers'), `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n\n/os-crm/v2/assinatura/*\n  X-Robots-Tag: noindex, nofollow\n`);
  console.log(`LP de produção gerada em ${output}`);
}
if (require.main === module) build(process.argv[2]);
module.exports = {build};
