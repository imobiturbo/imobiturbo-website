const fs = require('node:fs');
const path = require('node:path');
module.exports = function staticSitemapSources(root) {
  const index = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const children = index.includes('<sitemapindex') ? [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => {
    const url = new URL(match[1]);
    if (url.origin !== 'https://www.imobiturbo.com.br') throw new Error('Sitemap filho fora do host canônico');
    const file = path.join(root, url.pathname);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  }) : [];
  return { index, content: [index, ...children].join('\n') };
};
