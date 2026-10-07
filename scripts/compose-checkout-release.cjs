// Retain the deployed static site and overlay only this checkout release.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function files(root, dir = '') {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(dir, entry.name);
    return entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(path.join(root, relative)).isDirectory()) ? files(root, relative) : [relative];
  });
}
const changed = file => file === '_worker.js' || file === '_routes.json' || file === '_redirects' || file === '404.html' ||
  ['vagas/', 'vagas-v2/', 'vagas-obrigado/', 'skills-ia-obrigado/'].some(prefix => file.startsWith(prefix));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function compose(baseline, built, output, { skillsUpsellOnly = false, lowTicketOffersOnly = false } = {}) {
  for (const source of [baseline, built]) if (!fs.existsSync(path.join(source, '_worker.js'))) throw new Error('Missing release worker');
  if ([baseline, built].some(source => path.resolve(source) === path.resolve(output))) throw new Error('Output must be isolated');
  if (skillsUpsellOnly && lowTicketOffersOnly) throw new Error('Select one release scope');
  const selected = lowTicketOffersOnly ? file => ['bf-imobiliaria26/', 'maquina-de-prospeccao/', 'bf-imobiliaria26-obrigado/', 'maquina-de-prospeccao-obrigado/'].some(prefix => file.startsWith(prefix)) : skillsUpsellOnly ? file => file.startsWith('skills-ia-obrigado/') : changed;
  if (lowTicketOffersOnly) {
    for (const route of ['bf-imobiliaria26', 'maquina-de-prospeccao', 'bf-imobiliaria26-obrigado', 'maquina-de-prospeccao-obrigado']) {
      if (!fs.existsSync(path.join(built, route, 'index.html'))) throw new Error(`Missing offer route: ${route}`);
    }
  }
  if (skillsUpsellOnly || lowTicketOffersOnly) {
    for (const file of ['vagas/checkout-session.js', 'vagas/vagas.css']) {
      if (hash(path.join(baseline, file)) !== hash(path.join(built, file))) throw new Error(`Skills shared dependency differs from production: ${file}`);
    }
  }
  // Copy bytes into fresh regular files. Directory symlinks in old releases
  // must never point an overlay back into the retained rollback artifact.
  for (const file of files(baseline)) {
    const dest = path.join(output, file); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(baseline, file), dest);
  }
  for (const file of files(built).filter(selected)) {
    const dest = path.join(output, file); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(built, file), dest);
  }
  const protectedFiles = files(baseline).filter(file => !selected(file));
  for (const file of protectedFiles) if (hash(path.join(baseline, file)) !== hash(path.join(output, file))) throw new Error(`Unrelated asset changed: ${file}`);
  return { protectedFiles: protectedFiles.length, changed: files(built).filter(selected).length,
    workerSha256: hash(path.join(output, '_worker.js')), routes: JSON.parse(fs.readFileSync(path.join(output, '_routes.json'))) };
}
if (require.main === module) {
  const [baseline, built, output, scope] = process.argv.slice(2);
  if (!baseline || !built || !output || fs.existsSync(output) || (scope && !['--skills-upsell-only', '--low-ticket-offers-only'].includes(scope))) throw new Error('Pass baseline, built and a new output directory, optionally --skills-upsell-only or --low-ticket-offers-only');
  console.log(JSON.stringify(compose(baseline, built, output, { skillsUpsellOnly: scope === '--skills-upsell-only', lowTicketOffersOnly: scope === '--low-ticket-offers-only' })));
}
module.exports = { compose };
