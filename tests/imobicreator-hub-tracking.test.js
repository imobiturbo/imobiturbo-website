const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('imobicreator instala o Hub Tracker e não possui badges legadas de faturamento', () => {
  for (const dir of ['imobicreator', 'real-estate-ai-influencer']) {
    const html = fs.readFileSync(path.join(root, dir, 'index.html'), 'utf8');
    
    // Hub tracker script instalado no head
    assert.match(html, /<script id="hub-tracker" defer src="https:\/\/track\.nmidigital\.tech\/t\.js\?operation=[0-9a-f-]{36}"/);
    assert.match(html, /data-operation-id="00000000-0000-0000-0000-000000000001"/);
    assert.match(html, /data-endpoint="https:\/\/track\.nmidigital\.tech"/);
    assert.match(html, /site-tracking\.js/);

    // Badges Faixa 1, 2, 3 e Corporativo removidas dos botões de faturamento
    assert.equal(/<span class="option-card-pill">Faixa/i.test(html), false, `${dir} ainda contém badges de Faixa`);
    assert.equal(/<span class="option-card-pill">Corporativo/i.test(html), false, `${dir} ainda contém badge Corporativo`);
  }
});

test('imobicreator style.css garante max-height e overflow-y auto na modal de qualificação', () => {
  for (const dir of ['imobicreator', 'real-estate-ai-influencer']) {
    const css = fs.readFileSync(path.join(root, dir, 'style.css'), 'utf8');
    assert.match(css, /\.qualification-dialog\s*\{[^}]*max-height:\s*(calc\(100dvh|min\(92vh)/);
    assert.match(css, /\.qualification-dialog\s*\{[^}]*overflow-y:\s*auto/);
    assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  }
});

test('imobicreator app.js implementa Hub Tracker e eventos do funil', () => {
  for (const dir of ['imobicreator', 'real-estate-ai-influencer']) {
    const js = fs.readFileSync(path.join(root, dir, 'app.js'), 'utf8');
    
    // Fila do tracker e helpers
    assert.match(js, /function trackHubEvent\(/);
    assert.match(js, /function trackHubConversion\(/);
    assert.match(js, /flushHubTrackerEvents/);

    // Eventos mapeados
    assert.match(js, /trackHubEvent\('quiz_start'/);
    assert.match(js, /trackHubEvent\('quiz_step_viewed'/);
    assert.match(js, /trackHubEvent\('video_play'/);
    assert.match(js, /trackHubConversion\('lead'/);
    assert.match(js, /trackHubConversion\('initiateCheckout'/);
    assert.match(js, /trackHubEvent\('contact_whatsapp'/);

    // Prevenção de jump e travamento da modal no mobile
    assert.match(js, /dialog\.scrollTop\s*=\s*0/);
    assert.match(js, /document\.activeElement\.blur\(\)/);
  }
});
