const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '168.231.88.12';
const username = 'root';
const password = '@Isabel160423';
const remoteDir = '/home/natanpimentel/htdocs/www.imobiturbo.com.br';

const FILES_TO_UPLOAD = [
  // HTML wrappers
  { local: 'index.html', remote: 'index.html' },
  { local: 'colors_and_type.css', remote: 'colors_and_type.css' },
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
  { local: 'dist/audience.bundle.js', remote: 'dist/audience.bundle.js' }
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
