const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');

test('unfinished commercial terms cannot start a checkout or tracking journey', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /<button[^>]*disabled[^>]*>Quero entrar na Comunidade Imobiturbo<\/button>/);
  assert.match(html, /Contratação ainda não configurada nesta prévia\./);
  assert.doesNotMatch(html, /<script\b|<form\b|data-checkout|checkout\.abacatepay|12x\s*(?:de\s*)?R\$/i);
  for (const text of ['[PREÇO A CONFIRMAR]', '[PERIODICIDADE A CONFIRMAR]', 'Limites da IA: a confirmar', 'Cancelamento: a confirmar']) assert.ok(html.includes(text), text);
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

test('preview navigation resolves locally and pending media has no false controls', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(links.length >= 6);
  for (const href of links) {
    assert.ok(href.startsWith('#'), href);
    assert.ok(ids.has(href.slice(1)), href);
  }
  assert.doesNotMatch(html, /<iframe\b|<video\b|<audio\b|<input\b/i);
  assert.equal([...html.matchAll(/data-section="\d{2}"/g)].length, 13);
});

test('all page images are real local brand files with explicit dimensions', () => {
  const imgs = [...html.matchAll(/<img\b([^>]+)>/g)];
  assert.equal(imgs.length, 4);
  for (const [, attrs] of imgs) {
    const src = attrs.match(/\bsrc="([^"]+)"/)[1];
    assert.ok(src.startsWith('assets/brand/current/'));
    assert.ok(fs.existsSync(path.join(root, 'vagas', src)), src);
    assert.match(attrs, /\bwidth="\d+"/);
    assert.match(attrs, /\bheight="\d+"/);
    assert.match(attrs, /\balt="Imobiturbo/);
  }
});
