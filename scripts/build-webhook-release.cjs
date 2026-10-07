// VPS3: compile only the server functions and retain the deployed site's bytes.
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
console.log(JSON.stringify(compose(baseline, built, output, { webhookOnly: true })));
