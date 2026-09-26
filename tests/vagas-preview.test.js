const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');

test('vagas is ready for production traffic: indexed, active checkout and zero placeholder text', () => {
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /<button[^>]*id="checkoutBtn"[^>]*>\s*Quero entrar na Comunidade Imobiturbo\s*<\/button>/);
  assert.ok(!html.includes('disabled aria-describedby="checkout-status"'));
  assert.ok(html.includes('id="checkoutModalOverlay"'));

  const forbiddenPlaceholders = [
    '[PREÇO A CONFIRMAR]',
    '[PERIODICIDADE A CONFIRMAR]',
    '[CONDIÇÕES DE ACESSO A CONFIRMAR]',
    'Limites da IA: a confirmar',
    'Cancelamento: a confirmar',
    'Contratação ainda não configurada nesta prévia.',
    '[MENSAGEM DO CONTATO A FORNECER]',
    '[RESPOSTA REAL DA IA A FORNECER]',
    '[CONTINUAÇÃO DO EXEMPLO REAL A FORNECER]',
    '[TRECHO REAL DE ORIENTAÇÃO POR IA A FORNECER]',
    '[EXERCÍCIO REAL A FORNECER]',
    '[DÚVIDA REAL SOBRE O USO DO CRM A FORNECER]',
    '[RESPOSTA REAL DO ASSISTENTE A FORNECER]',
    '[APRESENTAÇÃO PROFISSIONAL A VALIDAR]',
    '[EVIDÊNCIA REAL 01 A FORNECER]',
    '[EVIDÊNCIA REAL 02 A FORNECER]',
    '[EVIDÊNCIA REAL 03 A FORNECER]',
    '[RELATO REAL 01 A FORNECER]',
    '[RELATO REAL 02 A FORNECER]',
    '[RELATO REAL 03 A FORNECER]',
    '[CANAL OFICIAL DE CONTATO A CONFIRMAR]',
    '[RAZÃO SOCIAL E IDENTIFICAÇÃO DA EMPRESA A CONFIRMAR]',
    '[ANO DO PROJETO]'
  ];
  for (const text of forbiddenPlaceholders) {
    assert.ok(!html.includes(text), `Must not contain placeholder: ${text}`);
  }
});

test('section 02 process cards contain rich realistic micro-UI and zero empty skeleton wireframes', () => {
  // No empty skeleton elements inside .concept
  assert.ok(!html.includes('<span><i></i><i></i></span>'));
  
  // Rich micro-UI elements
  assert.ok(html.includes('class="concept lesson-concept"'));
  assert.ok(html.includes('class="lesson-play-btn"'));
  assert.ok(html.includes('Captação Exclusiva com IA'));
  assert.ok(html.includes('class="lesson-progress-bar"'));

  assert.ok(html.includes('class="concept kanban-concept"'));
  assert.ok(html.includes('class="kanban-col"'));
  assert.ok(html.includes('Carlos M.'));
  assert.ok(html.includes('Dra. Silvia'));

  assert.ok(html.includes('class="concept chat-concept"'));
  assert.ok(html.includes('class="chat-bubble chat-bubble-user"'));
  assert.ok(html.includes('class="chat-bubble chat-bubble-ai"'));
  assert.ok(html.includes('Cliente pediu desconto na comissão'));
  assert.ok(html.includes('Assistente Imobiturbo'));
});

test('FAQ discloses eight questions with only the first answer initially open', () => {
  const details = [...html.matchAll(/<details\b([^>]*class="faq-item"[^>]*)>([\s\S]*?)<\/details>/g)];
  assert.equal(details.length, 8);
  assert.match(details[0][1], /\bopen\b/);
  assert.equal(details.slice(1).filter(d => /\bopen\b/.test(d[1])).length, 0);
  for (const [, , body] of details) {
    assert.match(body, /<summary>[\s\S]+<\/summary>/);
    assert.match(body, /<p>[\s\S]+<\/p>/);
  }
  assert.ok(html.includes('A disponibilidade de 24 horas se refere ao assistente de IA.'));
  assert.ok(html.includes('Participação nas mentorias ao vivo não incluída.'));
  assert.ok(html.includes('Orientação por IA não é atendimento pessoal de Natan.'));
});

test('page navigation resolves locally and covers all 13 semantic sections', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const internalLinks = [...html.matchAll(/<a\b[^>]*href="(#[^"]+)"/g)].map(m => m[1]);
  assert.ok(internalLinks.length >= 3);
  for (const href of internalLinks) {
    assert.ok(ids.has(href.slice(1)), `Internal link target ${href} must exist`);
  }
  assert.equal([...html.matchAll(/data-section="\d{2}"/g)].length, 13);
});

test('all page images are real local brand/case files with explicit dimensions', () => {
  const imgs = [...html.matchAll(/<img\b([^>]+)>/g)];
  assert.ok(imgs.length >= 20, "Page should contain all case proofs and assets");
  for (const [, attrs] of imgs) {
    const srcMatch = attrs.match(/\bsrc="([^"]+)"/);
    assert.ok(srcMatch, "Image must have src");
    const src = srcMatch[1];
    if (!src.startsWith('data:')) {
      const cleanSrc = src.replace(/^\.\//, '');
      assert.ok(fs.existsSync(path.join(root, 'vagas', cleanSrc)), `Image file ${cleanSrc} must exist`);
    }
    assert.match(attrs, /\bwidth="\d+"/);
    assert.match(attrs, /\bheight="\d+"/);
    assert.match(attrs, /\balt="[^"]+"/);
  }
});

test('vagas checkout modal always opens on mobile and desktop without bypassing or dead widgets', () => {
  for (const pagePath of ['vagas/index.html', 'vagas-v2/index.html']) {
    const content = fs.readFileSync(path.join(root, pagePath), 'utf8');
    assert.ok(!content.includes('prepareHotmartWidget'), `${pagePath} must not reference dead prepareHotmartWidget`);
    assert.match(content, /function openCheckoutModal\(e\)\s*\{[\s\S]*?showCheckoutForm\(selected\);[\s\S]*?modalOverlay\.showModal\(\);/, `${pagePath} must unconditionally open modalOverlay`);
    assert.ok(!content.includes('if (completed) continueToPayment();'), `${pagePath} must not bypass modalOverlay on completed state`);
    assert.match(content, /return Math\.min\(currentCheckoutStep, 3\);/, `${pagePath} getCheckoutResumeStep must be capped at 3`);
    assert.match(content, /<script[^>]*src="\/assets\/js\/hubla-checkout\.js/, `${pagePath} must load hubla-checkout.js`);
    assert.match(content, /id="chkName"[^>]*placeholder="Nome e Sobrenome"/, `${pagePath} must prompt for Nome e Sobrenome`);
    assert.match(content, /function isValidFullName/, `${pagePath} must define isValidFullName`);
    assert.match(content, /Qual é o seu <mark class="text-highlight">nome e sobrenome<\/mark>\?/, `${pagePath} must clearly ask for nome e sobrenome in modal title`);
  }
});

test('vagas checkout strictly validates Brazilian DDDs and blocks fake/dummy WhatsApp numbers', () => {
  const vm = require('node:vm');

  for (const pagePath of ['vagas/index.html', 'vagas-v2/index.html']) {
    const content = fs.readFileSync(path.join(root, pagePath), 'utf8');

    assert.ok(content.includes('const VALID_BRAZILIAN_DDDS = new Set(['), `${pagePath} must declare VALID_BRAZILIAN_DDDS`);
    assert.ok(content.includes('function getPhoneValidationError(val)'), `${pagePath} must define getPhoneValidationError`);
    assert.ok(content.includes('function isValidBrazilianPhone(val)'), `${pagePath} must define isValidBrazilianPhone`);
    assert.ok(content.includes('!isValidBrazilianPhone(inputPhone.value)'), `${pagePath} getCheckoutResumeStep must use isValidBrazilianPhone`);
    assert.ok(content.includes('const phoneErr = getPhoneValidationError(phoneVal);'), `${pagePath} step2Btn must validate phone via getPhoneValidationError`);
    assert.ok(content.includes('const phoneErr = getPhoneValidationError(phone);'), `${pagePath} continueToPayment must validate phone via getPhoneValidationError`);

    // Extract the phone validation block and execute in sandbox
    const match = content.match(/(const VALID_BRAZILIAN_DDDS = new Set\([\s\S]*?window\.isValidBrazilianPhone = isValidBrazilianPhone;\s*)/);
    assert.ok(match, `${pagePath} must contain validatable phone logic block`);

    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(match[1], sandbox);

    const { VALID_BRAZILIAN_DDDS, getPhoneValidationError, isValidBrazilianPhone } = sandbox.window;
    assert.equal(VALID_BRAZILIAN_DDDS.size, 67, 'Must map all 67 Anatel DDDs');

    // Reject non-existent DDDs
    const fakeDdds = ['00', '10', '20', '23', '25', '26', '29', '30', '36', '39', '50', '52', '56', '70', '72', '76', '78'];
    for (const ddd of fakeDdds) {
      assert.ok(!VALID_BRAZILIAN_DDDS.has(ddd), `DDD ${ddd} must not exist`);
      const err = getPhoneValidationError(`(${ddd}) 98765-4321`);
      assert.match(err, new RegExp(`O DDD ${ddd} não existe no Brasil`), `Fake DDD ${ddd} must be rejected with specific error`);
      assert.equal(isValidBrazilianPhone(`(${ddd}) 98765-4321`), false);
    }

    // Reject dummy repeating numbers
    const dummyNumbers = [
      '(11) 99999-9999',
      '(11) 98888-8888',
      '(11) 90000-0000',
      '(11) 91111-1111',
      '(11) 11111-1111',
      '(00) 00000-0000',
      '(11) 91234-5678',
      '(11) 98765-4321',
      '(11) 90123-4567',
      '(11) 97654-3210',
      '(11) 3234-5678',
      '12345',
      ''
    ];
    for (const num of dummyNumbers) {
      assert.ok(getPhoneValidationError(num) !== null, `Dummy number ${num} must be rejected`);
      assert.equal(isValidBrazilianPhone(num), false, `Dummy number ${num} must be invalid`);
    }

    // Accept real Brazilian mobile numbers across regions
    const realNumbers = [
      '(11) 98765-4320', // SP
      '(21) 98374-7796', // RJ
      '(31) 99871-2305', // MG
      '(47) 98412-9988', // SC
      '(61) 99128-4455', // DF
      '(71) 98822-3344', // BA
      '(85) 98711-2233', // CE
      '(92) 98123-4560', // AM
      '+55 (11) 98765-4320', // with +55 prefix
      '11987654320' // plain digits
    ];
    for (const num of realNumbers) {
      assert.equal(getPhoneValidationError(num), null, `Real number ${num} must be accepted`);
      assert.equal(isValidBrazilianPhone(num), true, `Real number ${num} must be valid`);
    }
  }
});


