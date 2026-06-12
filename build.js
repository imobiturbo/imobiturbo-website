const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function build() {
  console.log('Starting React build process...');

  try {
    // 1. Compile home.bundle.js
    console.log('Compiling Home bundle...');
    const homeSources = [
      'ui_kits/imobiturbo-app/components.jsx',
      'ui_kits/imobiturbo-app/premium-components.jsx',
      'ui_kits/imobiturbo-app/HomePrototypes.jsx'
    ];
    const homeCode = homeSources.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
    
    const homeResult = await esbuild.transform(homeCode, {
      loader: 'jsx',
      minify: true,
      target: 'es2016',
      charset: 'utf8'
    });
    fs.writeFileSync(path.join(distDir, 'home.bundle.js'), homeResult.code, 'utf8');
    console.log('Successfully created dist/home.bundle.js');

    // 2. Compile audience.bundle.js
    console.log('Compiling Audience bundle...');
    const audienceSources = [
      'ui_kits/imobiturbo-app/components.jsx',
      'ui_kits/imobiturbo-app/premium-components.jsx',
      'ui_kits/imobiturbo-app/AudiencePages.jsx'
    ];
    const audienceCode = audienceSources.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
    
    const audienceResult = await esbuild.transform(audienceCode, {
      loader: 'jsx',
      minify: true,
      target: 'es2016',
      charset: 'utf8'
    });
    fs.writeFileSync(path.join(distDir, 'audience.bundle.js'), audienceResult.code, 'utf8');
    console.log('Successfully created dist/audience.bundle.js');

    console.log('Build completed successfully!');
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}

build();
