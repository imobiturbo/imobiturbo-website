const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '168.231.88.12';
const username = 'root';
const password = process.env.IMOBITURBO_DEPLOY_PASSWORD;
const remoteDir = '/home/natanpimentel/htdocs/www.imobiturbo.com.br';

const FILES_TO_UPLOAD = [
  // HTML wrappers
  { local: 'index.html', remote: 'index.html' },
  { local: 'colors_and_type.css', remote: 'colors_and_type.css' },
  { local: 'home.css', remote: 'home.css' },
  { local: 'site-tracking.js', remote: 'site-tracking.js' },
  { local: 'depoimentos/index.html', remote: 'depoimentos/index.html' },
  { local: 'corretor-autonomo/index.html', remote: 'corretor-autonomo/index.html' },
  { local: 'imobiliarias/index.html', remote: 'imobiliarias/index.html' },
  { local: 'construtoras-incorporadoras/index.html', remote: 'construtoras-incorporadoras/index.html' },

  // React components
  { local: 'ui_kits/imobiturbo-app/components.jsx', remote: 'ui_kits/imobiturbo-app/components.jsx' },
  { local: 'ui_kits/imobiturbo-app/premium-components.jsx', remote: 'ui_kits/imobiturbo-app/premium-components.jsx' },
  { local: 'ui_kits/imobiturbo-app/HomePrototypes.jsx', remote: 'ui_kits/imobiturbo-app/HomePrototypes.jsx' },
  { local: 'ui_kits/imobiturbo-app/AudiencePages.jsx', remote: 'ui_kits/imobiturbo-app/AudiencePages.jsx' },
  { local: 'ui_kits/imobiturbo-app/audience-pages.css', remote: 'ui_kits/imobiturbo-app/audience-pages.css' },

  // Compiled assets
  { local: 'dist/home.bundle.js', remote: 'dist/home.bundle.js' },
  { local: 'dist/audience.bundle.js', remote: 'dist/audience.bundle.js' },

  // Assets da home
  { local: 'fonts/FuturaLT-CondExtraBold.ttf', remote: 'fonts/FuturaLT-CondExtraBold.ttf' },
  { local: 'assets/favicon.png', remote: 'assets/favicon.png' },
  { local: 'assets/logo-imobiturbo-white.png', remote: 'assets/logo-imobiturbo-white.png' },
  { local: 'assets/logo-imobiturbo-black-bg.png', remote: 'assets/logo-imobiturbo-black-bg.png' },
  { local: 'assets/home-hero-operacao-imobiliaria.webp', remote: 'assets/home-hero-operacao-imobiliaria.webp' },
  { local: 'assets/home-metodo-corretor-solo.webp', remote: 'assets/home-metodo-corretor-solo.webp' },
  { local: 'assets/home-consultoria-warroom.webp', remote: 'assets/home-consultoria-warroom.webp' },
  { local: 'assets/testimonials/resultados-01.webp', remote: 'assets/testimonials/resultados-01.webp' },
  { local: 'assets/testimonials/resultados-02.webp', remote: 'assets/testimonials/resultados-02.webp' },
  { local: 'assets/testimonials/resultados-03.webp', remote: 'assets/testimonials/resultados-03.webp' }
];

async function uploadFile(sftp, localPath, remotePath) {
  const fullRemotePath = path.posix.join(remoteDir, remotePath);
  const remoteParentDir = path.posix.dirname(fullRemotePath);

  // Ensure remote directory exists
  await new Promise((resolve, reject) => {
    sftp.mkdir(remoteParentDir, { mode: '0755' }, (err) => {
      // Ignore directory already exists errors
      resolve();
    });
  });

  console.log(`Uploading ${localPath} -> ${fullRemotePath}...`);
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, fullRemotePath, (err) => {
      if (err) {
        console.error(`Error uploading ${localPath}:`, err.message);
        reject(err);
      } else {
        console.log(`Successfully uploaded ${localPath}`);
        resolve();
      }
    });
  });
}

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn))
        .on('error', reject)
        .connect({ host, port: 22, username, password });
  });
}

async function main() {
  try {
    if (!password) throw new Error('Defina IMOBITURBO_DEPLOY_PASSWORD para publicar o site.');
    const conn = await connectSSH();
    console.log('Connected to server via SSH.');
    
    conn.sftp(async (err, sftp) => {
      if (err) {
        conn.end();
        throw err;
      }
      
      try {
        for (const item of FILES_TO_UPLOAD) {
          if (fs.existsSync(item.local)) {
            await uploadFile(sftp, item.local, item.remote);
          } else {
            console.warn(`Local file not found: ${item.local}`);
          }
        }
        console.log('All files uploaded successfully!');
      } catch (uploadErr) {
        console.error('Upload failed:', uploadErr.message);
      } finally {
        conn.end();
      }
    });
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

main();
