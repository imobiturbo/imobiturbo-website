const fs = require('node:fs');
const path = require('node:path');

// Keep the Skills upsell on the same offer, checkout and payment lifecycle as /vagas/.
// Fail the release if the source layout changes instead of silently publishing the home fallback.
function renderSkillsUpsell(community, journey) {
  const main = '<main id="conteudo" tabindex="-1">';
  for (const marker of ['</head>', main, '</main>', 'id="checkoutBtn"', 'ImobiturboCheckoutSession.bindLanding']) {
    if (!community.includes(marker)) throw new Error(`Skills upsell: missing community marker ${marker}`);
  }
  const split = community.indexOf('</head>');
  let head = community.slice(0, split);
  let body = community.slice(split);
  const title = '54 Skills de IA | Próximo passo e acesso';
  head = head
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")/g, `$1${title}$2`)
    .replace('content="index, follow"', 'content="noindex, follow"')
    .replaceAll('https://www.imobiturbo.com.br/vagas/"', 'https://www.imobiturbo.com.br/skills-ia-obrigado/"');
  body = body
    .replace(/data-lp-version="[^"]+"/, 'data-lp-version="skills-upsell-20261004"')
    .replace(/<div class="livebar" role="note">[\s\S]*?<\/div>/, '')
    .replace(main, `${main}\n${journey}`);
  return (head + body)
    .replaceAll('./vagas.css', '/vagas/vagas.css')
    .replace(/(["'(=])(?:\.\/)?assets\//g, '$1/vagas/assets/');
}

function buildSkillsUpsell(root, output) {
  const community = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
  const journey = fs.readFileSync(path.join(root, 'skills-ia-obrigado/journey.html'), 'utf8');
  const directory = path.join(output, 'skills-ia-obrigado');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), renderSkillsUpsell(community, journey));
}

module.exports = { renderSkillsUpsell, buildSkillsUpsell };
