// Compile on VPS3 and retain every unrelated file from the deployed artifact.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compose } = require('./compose-checkout-release.cjs');
const root = path.resolve(__dirname, '..');
if (require('node:os').hostname() !== 'vmi3482766' || !root.startsWith('/opt/builds/')) throw Error('Build requires VPS3 /opt/builds');
const [baseline, output] = process.argv.slice(2);
if (!baseline || !output || fs.existsSync(output) || fs.existsSync(output + '-built')) throw Error('Pass deployed baseline and a new release path');
const built = output + '-built';
fs.mkdirSync(built, { recursive: true });
execFileSync(path.join(root, 'node_modules/.bin/wrangler'), ['pages', 'functions', 'build', 'functions',
  '--outdir', built, '--build-output-directory', baseline, '--minify'], { cwd: root, stdio: 'inherit' });
if (fs.existsSync(path.join(built, 'index.js'))) fs.renameSync(path.join(built, 'index.js'), path.join(built, '_worker.js'));
if (!fs.existsSync(path.join(built, '_worker.js'))) throw Error('Missing compiled Worker');
// Keep the current routing contract; this release does not add a public endpoint.
fs.copyFileSync(path.join(baseline, '_routes.json'), path.join(built, '_routes.json'));
fs.mkdirSync(path.join(built, 'vagas'));
for (const file of ['index.html', 'lead-capture.js']) fs.copyFileSync(path.join(root, 'vagas', file), path.join(built, 'vagas', file));
const summary = compose(baseline, built, output);
console.log(JSON.stringify(summary));
