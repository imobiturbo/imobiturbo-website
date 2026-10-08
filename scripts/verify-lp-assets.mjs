import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyLPAssets(artifact, pages) {
  const root = path.resolve(artifact), checked = new Set(), missing = [];
  const inspect = (value, owner) => {
    const url = new URL(value.replaceAll('&amp;', '&'), 'https://lp.invalid/' + owner);
    if (url.origin !== 'https://lp.invalid') return;
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw Error('Asset outside artifact');
    checked.add(relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      missing.push({ page: owner, resource: value, file: relative });
      return;
    }
    if (relative.endsWith('.css') && !styles.has(relative)) {
      styles.add(relative);
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) inspect(match[1], relative);
    }
  };
  const styles = new Set();
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/<(img|source|script|link)\b[^>]*>/gi)) {
      const attributes = new Map([...match[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(a => [a[1].toLowerCase(), a[2] ?? a[3]]));
      if (match[1].toLowerCase() === 'link' && !/(?:stylesheet|preload|modulepreload|icon)/.test(attributes.get('rel') || '')) continue;
      for (const key of ['src', 'data-lazy-src', 'href']) if (attributes.has(key)) inspect(attributes.get(key), page);
      if (attributes.has('srcset')) for (const item of attributes.get('srcset').split(',')) inspect(item.trim().split(/\s+/)[0], page);
    }
    inspect('./offer.json', page);
  }
  return { pages, checkedResources: checked.size, missing, passes: missing.length === 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [artifact = '.cloudflare-pages', ...requested] = process.argv.slice(2);
  const report = verifyLPAssets(artifact, requested.length ? requested : ['skills-ia/index.html', 'maquina-de-prospeccao/index.html']);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passes) process.exitCode = 1;
}
