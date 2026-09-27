# Upsell de consultoria: roteiro padrão ou tema escolhido — 2026-09-27

## Resultado publicado

A página https://www.imobiturbo.com.br/vagas-obrigado/ apresenta a consultoria
individual de 60 minutos com duas alternativas: seguir o roteiro padrão
(criar um criativo, turbinar o anúncio e integrar os leads ao CRM) ou trabalhar
um tema escolhido pelo comprador.

A seção “Dois caminhos. Você escolhe o foco.” detalha essas alternativas e
apresenta seis possibilidades de foco: criativo e mensagem do anúncio;
turbinar no Instagram; integração dos leads ao CRM; organização do CRM;
IA no WhatsApp; follow-up e retomada de contato. São temas possíveis, sem
alegação de casos de sucesso nem promessa de concluir todos em uma hora.
O andamento considera o ponto de partida e os acessos disponíveis; a verba
de anúncios é separada.

A estrutura de upsell, a identidade preta/limão, o retrato existente, os três
botões de contratação e a alternativa de seguir para os acessos foram
preservados. A exclusividade da oferta nesta página aparece na abertura,
no fechamento, no resumo do checkout e nas perguntas frequentes. Essa é
uma condição comunicada na oferta, sem contador ou bloqueio técnico de URL.

O rodapé mantém o e-mail original da compra da comunidade e a orientação
para usá-lo no Club e no CRM. Editar o e-mail da consultoria não substitui
esse endereço. Sem perfil válido na sessão, aparece a orientação geral
de acesso. A compra opcional da consultoria permanece separada da comunidade.

## Código e publicação

- PR funcional: https://github.com/imobiturbo/imobiturbo-website/pull/24,
  integrado em `2026-09-27T20:10:50Z`.
- Commit publicado: `b8bcc2425279cca26feb70ca4b54106e8cdebd6b`.
- Candidato final: `a6bb8a1c663f2f788ebeeaa846f7539564f3e207`;
  sua árvore Git é idêntica à do commit integrado.
- Deployment Production/main: `8b572ed7-e7d9-4d5f-af3f-e308e0800d2b`.
- Deployment URL: https://8b572ed7.imobiturbo-website.pages.dev.
- Publicação registrada em `2026-09-27T20:13:24.051402Z`.
- Checkout de release na VPS3:
  `/opt/builds/imobiturbo-website-release-session-options-b8bcc2425279`.
- Baseline de rollback: `9eb8e9c4-8ffa-4b58-ba91-85a5f925b979`, fonte
  `374c612f93d1b37ac9d356203a78fc0febfca019`, em
  https://9eb8e9c4.imobiturbo-website.pages.dev. Não foi acionado.

O PR altera somente `vagas-obrigado/index.html`, `vagas-obrigado/upsell.css`
e `vagas-obrigado/DESIGN.md`. O JavaScript do checkout permanece inalterado.
A versão do CSS é `20260927-session-options`; as versões de `upsell.js`
e `checkout-session.js` permanecem `20260927-access-email` e `20260927-2`.

## Validação executada

Os testes, build e publicação ocorreram na VPS3 (`vmi3482766`), sob
`/var/lock/imobiturbo-ci.lock`. No checkout integrado, os logs registram
151/151 testes unitários, 8/8 testes de navegador e build/publicação Pages
concluídos. O build integrado está registrado em `deploy-pages.log`.
GitHub Actions foi conferido como `enabled: false`; GitHub foi usado
exclusivamente para versionamento.

A regressão de navegador cobre Pix/cartão, opções de 1x a 12x,
preenchimento vindo de `/vagas/` e `/vagas-v2/`, preservação do e-mail original
e de sua validade, orientação sem perfil, limpeza do perfil, renderização
literal do endereço e comportamento do modal. Pagamentos foram simulados.

A verificação visual e de interação do candidato final foi registrada em
`2026-09-27T20:03:45.428Z`, com os seguintes resultados:

| Janela | Transbordamento horizontal | Botões de checkout | Novas perguntas frequentes | E-mail original |
| --- | --- | --- | --- | --- |
| 1440 × 1000 | Ausente | 3/3 | 3/3 | Preservado |
| 390 × 844 | Ausente | 3/3 | 3/3 | Preservado |
| 320 × 760 | Ausente | 3/3 | 3/3 | Preservado |
| 580 × 1000 | Ausente | 3/3 | 3/3 | Preservado |

As imagens carregaram e não houve erros de execução registrados. Em
320 × 760, o primeiro botão termina em `751,0625px`, dentro da altura da
janela, após o ajuste de espaçamento da abertura.

## Verificação pública e integridade

O hostname do deployment retornou HTTP 200 e conteúdo idêntico ao código
publicado em `2026-09-27T20:13:56.420Z`.

O domínio público foi verificado pelo Chrome compartilhado, em uma aba nova
da tarefa, em `2026-09-27T20:16:43.074Z`. Passaram os cenários com e-mail
nas larguras 1440, 390 e 320px, além do cenário sem perfil em 390px.
Foram conferidos os dois caminhos, três passos padrão, seis temas, colunas
responsivas, exclusividade, carregamento das imagens, três botões de
checkout, agenda bloqueada antes do pagamento e os acessos independentes:
https://club.imobiturbo.com.br/login e
https://app.imobiturbo.com.br/onboarding.

As quatro respostas abaixo retornaram HTTP 200 no domínio público,
com SHA-256 idêntico à fonte publicada:

| Arquivo | SHA-256 |
| --- | --- |
| `vagas-obrigado/index.html` | `e5922a464785830383c32b23e35002199fb01476d1dab70926595e3c6e5e83c4` |
| `vagas-obrigado/upsell.css` | `fe6a157a79edf0fcf69198369c05e40a417c2ce8a38d1caa036e75011e34038c` |
| `vagas-obrigado/upsell.js` | `bf197be7cf9457765e8596043da63f0d00c6405badfd4d94bd8a13f3fd5f29dd` |
| `vagas/checkout-session.js` | `8d0ebf7bcff962ad179e061d1194e23932a67797a8435fc44c0caec75d8a3b07` |

As sondagens anteriores por HTTP e navegador headless na VPS3 receberam
HTTP 403 com desafio Cloudflare. A verificação posterior no Chrome
compartilhado retornou HTTP 200 e passou; nenhuma regra de WAF foi alterada.

O arquivo `release-metadata.json` conserva `publicVerification: "pending"`,
pois foi gravado antes dessas verificações. Ele não foi atualizado nesta
documentação. Os resultados posteriores estão em
`public-pages-verification.json` e
`public-domain/public-domain-verification.json`; o campo inicial não
representa o resultado final da verificação pública.

## Evidências e limites

Raiz na VPS3:
`/opt/builds/imobiturbo-website-upsell-session-options-20260927-evidence/`.

Na subpasta `release-b8bcc2425279/` estão `npm-test.log`,
`browser-tests.log`, `deploy-pages.log`, `release-metadata.json`,
`rollback.json`, `source-sha.txt`, `source-tree.txt`,
`github-actions-permissions.json`, `public-pages-verification.json`,
`public-domain-http-probe.json` e `public-domain-headless-probe.json`.
O resultado final no domínio e suas capturas estão em `public-domain/`.

A pasta `visual-final/`, na raiz das evidências, contém
`visual-interactions.json` e capturas da abertura, página completa,
roteiros e acessos nas quatro larguras. As capturas públicas incluem
`desktop-email-hero.png`, `mobile-email-hero.png`, `narrow-email-hero.png`,
`mobile-email.png` e `mobile-fallback.png`.

A cópia local da evidência pública está em
`/tmp/upsell-session-options-review-20260927/public/`. Os caminhos temporários
locais não substituem a retenção das evidências na VPS3.

Foram usados somente dados sintéticos; requisições de pagamento e
rastreamento foram bloqueadas ou simuladas. Não houve cobrança real,
mensagem a cliente ou liberação real de acesso. As abas anteriores e o
armazenamento compartilhado permaneceram intactos; a aba da tarefa ficou
aberta. Essa verificação não certifica uma venda real nem mede conversão.

Este relatório documenta a publicação existente. Sua inclusão no Git
altera apenas documentação e não exige novo build ou deployment.
