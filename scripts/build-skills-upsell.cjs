const fs = require('node:fs');
const path = require('node:path');

// Publish the original dedicated journey, with shared assets resolved on both URL forms.
// A missing page or checkout must fail the release instead of serving the home fallback.
function renderSkillsUpsell(source) {
  for (const marker of ['</head>', '<main id="conteudo"', '</main>', 'class="journey-steps"', 'id="skillsAccessLink"', 'id="checkoutBtn"', 'ImobiturboCheckoutSession.bindLanding', 'window.openSkillsCommunityCheckout']) {
    if (!source.includes(marker)) throw new Error(`Skills upsell: missing page marker ${marker}`);
  }
  return source
    .replaceAll('./vagas.css', '/vagas/vagas.css')
    .replace(/(["'(=])(?:\.\/)?assets\//g, '$1/vagas/assets/');
}

function buildSkillsUpsell(root, output) {
  const source = fs.readFileSync(path.join(root, 'skills-ia-obrigado/index.html'), 'utf8');
  const directory = path.join(output, 'skills-ia-obrigado');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), renderSkillsUpsell(source));
}

module.exports = { renderSkillsUpsell, buildSkillsUpsell };
