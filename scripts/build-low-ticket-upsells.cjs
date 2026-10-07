const fs = require('node:fs');
const path = require('node:path');
const { renderSkillsUpsell } = require('./build-skills-upsell.cjs');

// O checkout, a VSL, os planos e a apresentação usam a mesma fonte das Skills.
// Somente o nome do kit, a rota e a instrução de entrega variam entre ofertas.
const offers = [
  { route: 'bf-imobiliaria26-obrigado', publicPath: 'bf-imobiliaria26/obrigado', title: 'Black Friday Imobiliária 2026', step: 'Black Friday', kit: 'SuperCombo Black Friday Imobiliária 2026' },
  { route: 'maquina-de-prospeccao-obrigado', publicPath: 'maquina-de-prospeccao/obrigado', title: 'Máquina de Prospecção', step: 'Máquina de Prospecção', kit: 'Máquina de Prospecção' },
];

function renderLowTicketUpsell(source, offer) {
  if (!offers.includes(offer)) throw new Error('Oferta de upsell desconhecida');
  let html = renderSkillsUpsell(source)
    .replaceAll('href="../favicon.svg"', 'href="/favicon.svg"')
    .replaceAll('href="../assets/favicon.png"', 'href="/assets/favicon.png"')
    .replaceAll('../fonts/', '/fonts/');
  const replacements = [
    ['54 Skills de IA | Próximo passo e acesso', `${offer.title} | Próximo passo e acesso`],
    ['/skills-ia-obrigado/', `/${offer.publicPath}/`],
    ['<span>Skills de IA</span>', `<span>${offer.step}</span>`],
    ['Obrigado por escolher as 54 Skills de IA. Veja seus acessos e o próximo passo opcional.', `Obrigado por escolher ${offer.kit}. Veja como receber seu material e o próximo passo opcional.`],
    ['<p class="eyebrow">ACESSO CONFIRMADO</p><h2 id="accessTitle">Onde encontrar seus acessos</h2>', '<p class="eyebrow">SEU MATERIAL</p><h2 id="accessTitle">Onde encontrar seu material</h2>'],
    ['Entre com o e-mail usado na compra das Skills. Consulte também as instruções de acesso enviadas após a confirmação do pagamento.', `Após a confirmação do pagamento de ${offer.kit}, enviamos as instruções de acesso ao Club para o e-mail usado na compra. Confira também a pasta de spam. Entre com esse e-mail e abra a biblioteca do seu produto para baixar os arquivos.`],
    ['id="skillsAccessLink" class="btn" href="https://club.imobiturbo.com.br/login">Acessar minhas Skills', 'id="skillsAccessLink" class="btn" href="https://club.imobiturbo.com.br/login">Acessar meu material'],
    ['O acesso às Skills depende apenas da confirmação da compra do kit. A assinatura é opcional e não é necessária para usar suas Skills.', 'A entrega do kit depende apenas da confirmação da compra dele. A assinatura da Comunidade é opcional e não é necessária para usar seu material.'],
  ];
  for (const [previous, next] of replacements) {
    if (!html.includes(previous)) throw new Error(`A fonte do upsell mudou: ${previous.slice(0, 70)}`);
    html = html.replaceAll(previous, next);
  }
  return html;
}

function buildLowTicketUpsells(root, output) {
  const source = fs.readFileSync(path.join(root, 'skills-ia-obrigado/index.html'), 'utf8');
  for (const offer of offers) {
    for (const route of [offer.publicPath, offer.route]) {
      const directory = path.join(output, route);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'index.html'), renderLowTicketUpsell(source, offer));
    }
  }
}

module.exports = { offers, renderLowTicketUpsell, buildLowTicketUpsells };
