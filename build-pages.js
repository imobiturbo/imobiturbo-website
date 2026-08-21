const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const output = path.join(root, '.cloudflare-pages');
const entries = [
  'index.html',
  'colors_and_type.css',
  'home.css',
  'site-tracking.js',
  'site.webmanifest',
  'favicon.ico',
  'favicon.png',
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
  'prompts-para-anuncios',
  'test',
  'ui_kits',
  'guia',
  'downloads',
  'lovable',
  'demo',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
];

execFileSync(process.execPath, ['build.js'], { cwd: root, stdio: 'inherit' });
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler', 'pages', 'functions', 'build', 'functions', '--outdir', output, '--build-output-directory', output, '--minify'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);
fs.renameSync(path.join(output, 'index.js'), path.join(output, '_worker.js'));

console.log(`Cloudflare Pages artifact created in ${output}`);
