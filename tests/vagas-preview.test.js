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
