const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildSkillsUpsell } = require('./scripts/build-skills-upsell.cjs');

const root = __dirname;
const output = path.join(root, '.cloudflare-pages');
const entries = [
  'index.html',
  'legal.css',
  'colors_and_type.css',
  'home.css',
  'site-tracking.js',
  'organic.css',
  'organic.js',
  'sitemaps',
  'site.webmanifest',
  'favicon.ico',
  'favicon.png',
  'favicon.svg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'assets',
  'fonts',
  'dist',
  'depoimentos',
  'corretor-autonomo',
  'imobiliarias',
  'construtoras-incorporadoras',
  'real-estate-ai-influencer',
  'imobicreator',
  'prompts-para-anuncios',
  'test',
  'ui_kits',
  'guia',
  'guias',
  'downloads',
  'lovable',
  'demo',
  'vagas',
  'vagas-v2',
  'vagas-obrigado',
  'live',
  'skills-ia',
  'skills-ia-obrigado',
  'bf-imobiliaria26',
  'politica-de-privacidade',
  'exclusao-de-dados',
  'termos-de-servico',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
];

// Build the isolated official shadcn interface for /oficina/ and /oficina/obrigado/.
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: path.join(root, 'tools/oficina-web'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}

fs.cpSync(path.join(root, 'tools/oficina-web/dist'), path.join(output, 'oficina'), { recursive: true });

// Generate compiled JS and the matching initial HTML only inside the release artifact.
execFileSync(process.execPath, ['build.js'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, IMT_BUILD_OUTPUT_DIR: output },
});

// Wiapy sends both Skills kits here after payment, including URLs with UTMs.
buildSkillsUpsell(root, output);

// Ensure relative symlink for vagas-v2/assets within build output
const v2Assets = path.join(output, 'vagas-v2', 'assets');
if (fs.existsSync(v2Assets)) {
  try {
    if (fs.lstatSync(v2Assets).isSymbolicLink()) {
      fs.unlinkSync(v2Assets);
      fs.symlinkSync('../vagas/assets', v2Assets);
    }
  } catch (_) {}
}

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler', 'pages', 'functions', 'build', 'functions', '--outdir', output, '--build-output-directory', output, '--minify'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);
fs.renameSync(path.join(output, 'index.js'), path.join(output, '_worker.js'));

console.log(`Cloudflare Pages artifact created in ${output}`);
