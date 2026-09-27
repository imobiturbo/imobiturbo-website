# E-mail de acesso no rodapé do upsell — 2026-09-27

## Resultado publicado

A página https://www.imobiturbo.com.br/vagas-obrigado/ exibe o e-mail da compra
original da comunidade acima dos botões do Club e do CRM. O painel orienta:
“Use este mesmo e-mail para acessar o Imobiturbo Club e configurar seu CRM.”
O texto é selecionável, usa `textContent` e quebra dentro do painel no celular.

O formulário opcional de consultoria continua enviando o e-mail escolhido para
aquela compra, mas não substitui o perfil nem prorroga a validade do e-mail de
acesso original. A orientação sobre confirmação do pagamento, os botões e o
link de suporte permanecem presentes.

O perfil existente permanece restrito à sessão, com validade de duas horas.
Ausência, expiração, dados inválidos ou indisponibilidade do armazenamento
mostram “Use o e-mail da sua compra para entrar.” A limpeza do perfil ao aceitar
ou recusar a oferta foi preservada; uma nova visita sem perfil usa essa orientação.
Nenhum novo armazenamento persistente, parâmetro de e-mail na URL ou payload
de rastreamento foi acrescentado.

## Código e publicação

- PR funcional: https://github.com/imobiturbo/imobiturbo-website/pull/23.
- Commit publicado: `374c612f93d1b37ac9d356203a78fc0febfca019`.
- Deployment Production/main: `9eb8e9c4-8ffa-4b58-ba91-85a5f925b979`.
- Deployment URL: https://9eb8e9c4.imobiturbo-website.pages.dev.
- Publicação registrada em `2026-09-27T17:30:09.808Z`.
- Rollback disponível: `baae50c3-3964-4ed2-aed2-ff7352d2e251`, fonte
  `9fccf7fa9ebdd2f81f84c433a90f7f14b6e8b948`; não foi acionado.

## Validação executada

Todos os testes, build e publicação foram executados na VPS3 (`vmi3482766`),
sob `/var/lock/imobiturbo-ci.lock`, a partir do checkout integrado e limpo.
`npm ci`, 151/151 testes unitários, 8/8 testes de navegador e `build:pages`
passaram. GitHub foi usado exclusivamente para versionamento.

Os testes de navegador cobrem os checkouts Pix/cartão de `/vagas/` e
`/vagas-v2/`, preservação do e-mail original e da expiração após editar os dados
da consultoria e recarregar, fallbacks, limpeza do perfil, renderização literal,
larguras de 1440/390/320 px e comportamento existente do modal/parcelamento.
As APIs de pagamento foram simuladas; nenhuma cobrança real foi criada.

A página pública foi conferida no Chrome em uma aba exclusiva da tarefa, com
dados sintéticos e armazenamento em memória, nas larguras 1440 e 390 px. O
painel com e-mail e o fallback passaram, sem transbordamento horizontal nem
erros de execução. As capturas desktop/mobile/fallback foram inspecionadas.
Os links conferidos foram `https://club.imobiturbo.com.br/login` e
`https://app.imobiturbo.com.br/onboarding`.

Às `17:39:47Z`, HTML, CSS, JavaScript do upsell e `checkout-session.js` no domínio
público retornaram HTTP 200 e SHA-256 idêntico ao código publicado. Às
`17:40:19Z`, a mesma comparação passou no hostname do deployment Pages.

A primeira execução do verificador público reutilizou o documento ao navegar
para a mesma URL e falhou no fixture sem perfil. O verificador foi corrigido
para abrir um documento novo entre cenários; a nova execução passou. Esse
ajuste foi exclusivo do verificador, sem alteração adicional no produto.

## Evidências e limites

Raiz na VPS3:
`/opt/builds/imobiturbo-website-upsell-access-email-20260927-evidence/release-374c612f93d1/`.

Arquivos: `npm-test.log`, `browser-tests.log`, `build-pages.log`,
`release-metadata.json`, `rollback.json`, `public-pages-verification.json` e
`public-domain-reloaded/public-domain-verification.json`. As capturas finais
estão em `public-domain-reloaded/{desktop-email,mobile-email,mobile-fallback}.png`.
A falha inicial foi mantida em `public-domain/verification-error.json`.

Foram usados exclusivamente dados sintéticos. O armazenamento real e as abas
anteriores do navegador não foram alterados; as abas da tarefa ficaram abertas.
O teste visual público bloqueou requisições de pagamento e rastreamento.
Esta evidência não certifica uma nova venda real nem uma liberação real de acesso.
Este relatório documenta o deployment existente e não exige nova publicação.
