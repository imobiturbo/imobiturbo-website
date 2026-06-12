const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.imobiturbo.com.br';

const FILES_TO_DOWNLOAD = [
  // Core pages and CSS
  { url: `${BASE_URL}/`, dest: 'index.html' },
  { url: `${BASE_URL}/colors_and_type.css`, dest: 'colors_and_type.css' },
  
  // React / CDN components
  { url: `${BASE_URL}/ui_kits/imobiturbo-app/components.jsx`, dest: 'ui_kits/imobiturbo-app/components.jsx' },
  { url: `${BASE_URL}/ui_kits/imobiturbo-app/premium-components.jsx`, dest: 'ui_kits/imobiturbo-app/premium-components.jsx' },
  { url: `${BASE_URL}/ui_kits/imobiturbo-app/HomePrototypes.jsx`, dest: 'ui_kits/imobiturbo-app/HomePrototypes.jsx' },
  { url: `${BASE_URL}/ui_kits/imobiturbo-app/AudiencePages.jsx`, dest: 'ui_kits/imobiturbo-app/AudiencePages.jsx' },
  { url: `${BASE_URL}/ui_kits/imobiturbo-app/audience-pages.css`, dest: 'ui_kits/imobiturbo-app/audience-pages.css' },
  
  // Audience pages
  { url: `${BASE_URL}/corretor-autonomo/`, dest: 'corretor-autonomo/index.html' },
  { url: `${BASE_URL}/imobiliarias/`, dest: 'imobiliarias/index.html' },
  { url: `${BASE_URL}/construtoras-incorporadoras/`, dest: 'construtoras-incorporadoras/index.html' },
  
  // Local Assets
  { url: `${BASE_URL}/assets/favicon.png`, dest: 'assets/favicon.png' },
  { url: `${BASE_URL}/assets/logo-imobiturbo-black-bg.png`, dest: 'assets/logo-imobiturbo-black-bg.png' },
  { url: `${BASE_URL}/assets/logo-imobiturbo-white.png`, dest: 'assets/logo-imobiturbo-white.png' },
  { url: `${BASE_URL}/assets/home-hero-operacao-imobiliaria.webp`, dest: 'assets/home-hero-operacao-imobiliaria.webp' },
  { url: `${BASE_URL}/assets/home-metodo-corretor-solo.webp`, dest: 'assets/home-metodo-corretor-solo.webp' },
  { url: `${BASE_URL}/assets/home-consultoria-warroom.webp`, dest: 'assets/home-consultoria-warroom.webp' },
  
  // Testimonials Page
  { url: `${BASE_URL}/depoimentos`, dest: 'depoimentos/index.html' },
  { url: 'https://lp.imobiturbo.com.br/depoimentos/logo.png', dest: 'depoimentos/logo.png' }
];

async function downloadFile(url, destPath) {
  const fullDestPath = path.resolve(__dirname, destPath);
  const dir = path.dirname(fullDestPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Downloading ${url} -> ${destPath}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(fullDestPath, buffer);
    console.log(`Successfully saved ${destPath}`);
  } catch (err) {
    console.error(`Error downloading ${url}:`, err.message);
  }
}

async function main() {
  for (const item of FILES_TO_DOWNLOAD) {
    await downloadFile(item.url, item.dest);
  }
  console.log('Done!');
}

main();
