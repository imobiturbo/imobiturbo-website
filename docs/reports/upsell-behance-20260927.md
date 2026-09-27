# Redesign da consultoria individual — 2026-09-27

## Escopo e referências

Rota: `https://www.imobiturbo.com.br/vagas-obrigado/`. O print de upsell fornecido pelo usuário e o projeto Inside Circle, no Behance, orientam a composição: três etapas, título centralizado, oferta com imagem, aceitar/recusar, explicação, benefícios, perguntas e fechamento. A identidade, a fotografia e a oferta são da Imobiturbo.

Base de implementação: `dec45887254045a910efd890548460ca839fee39`, em worktree isolado na branch `feat/upsell-behance-20260927`. Alterações de interface limitadas a `vagas-obrigado/index.html` e `vagas-obrigado/upsell.css`.

## Resultado implementado

Cabeçalho compacto; faixa Comunidade / Consultoria opcional / Seus acessos; oferta inicial com preço, CTA, recusa e fotografia original; alternância de superfícies escuras, claras e limão; roteiro em três passos; contratação final e quatro perguntas expansíveis.

As três ações abrem o checkout existente. Permanecem o preenchimento vindo da landing, Pix/cartão, recuperação de pagamento pendente e verificação de pagamento antes da agenda. Preço preservado: R$497 à vista ou até 3x sem juros; de 4x a 12x, total R$588, incluindo R$91 de juros. Nenhuma cobrança real foi criada para validar o redesign.

## Evidências de validação

Executor exclusivo: VPS3, `vmi3482766`, em `/opt/builds/imobiturbo-website-upsell-behance-20260927`.

- `npm test`: 151/151 aprovados, sem falhas ou testes ignorados.
- `upsell-checkout.browser.cjs` e `checkout-upsell-prefill.browser.cjs`: 5/5 aprovados, com APIs simuladas.
- `npm run build:pages`: artefato gerado com sucesso.
- Capturas e interações em 1440×1000, 390×844, 320×760 e 580×1000: sem overflow horizontal, imagens carregadas, primeira ação visível, três CTAs funcionais, retorno de foco após Escape, FAQ e recusa até os acessos.
- GitHub Actions confirmado desativado (`enabled: false`).

Os hashes abaixo correspondem aos arquivos locais e aos arquivos efetivamente testados na VPS3. As capturas foram produzidas depois da última alteração de HTML/CSS.

| Arquivo | SHA-256 |
| --- | --- |
| `vagas-obrigado/index.html` | `f8179db1418c51b1bb983789c727cb20c885ea33d9495de1e0e503a8ad5253e1` |
| `vagas-obrigado/upsell.css` | `bc8c6f138715ad1639a68c72cbc8d4c9c35a822a2d908deabb7f85a2a36cd9db` |
| `vagas-obrigado/upsell.js` | `2aba61908bb3727400e7ed8ad9140001fb527e10daa81331f6bb8e827b8f9656` |
| `vagas/checkout-session.js` | `8d0ebf7bcff962ad179e061d1194e23932a67797a8435fc44c0caec75d8a3b07` |

Logs: `/opt/builds/imobiturbo-website-upsell-behance-20260927-evidence/`. Capturas: `.impeccable/review/`, no worktree e na VPS3. Arquivos de revisão são evidências, não material de marketing.

## Revisão visual

Revisão independente concluída pelo agente Anscombe (`01a0e39d-afc2-79b1-b927-c9db18b07d55`), na função nativa reviewer (gpt-6-luna/max), substituindo a função especializada Impeccable Finish Reviewer. **Veredito: ship. Nenhuma correção material identificada.** O revisor inspecionou as capturas obrigatórias, incluindo os checkouts de 390 e 1440px, os arquivos e a documentação da rota; não repetiu os testes.

Persistence: documentação e proveniência presentes e consistentes. Fidelity: composição compatível com as referências e oferta real. TYPE: fonte local oficial; MATERIAL: retrato original e SVGs; GROUND: superfícies escura, papel, branca e limão documentadas. Ceiling: não avaliável contra um card QUALITY BAR ausente; não há alegação de aprovação pixel a pixel. Manter os três CTAs, as condições completas, a recusa visível e os acessos independentes.

O detector apontou somente três ocorrências de fonte frequente no mercado. Plus Jakarta Sans é uma escolha explícita de `PRODUCT.md` e foi mantida. Não existe composição gerada aprovada nem sorteio de conceito: a execução adapta diretamente as referências escolhidas pelo usuário.

Sistema visual: `vagas-obrigado/DESIGN.md` e `.impeccable/surfaces/vagas-obrigado/design.json`. Proveniência dos ativos: `docs/design/vagas-obrigado-assets.md`. Os documentos da raiz e os arquivos de imagem existentes foram preservados.

## Publicação e limite da prova

PR [#21](https://github.com/imobiturbo/imobiturbo-website/pull/21) integrado em `9fccf7fa9ebdd2f81f84c433a90f7f14b6e8b948`. A release saiu de checkout limpo desse SHA, na VPS3, sob `/var/lock/imobiturbo-ci.lock`. Nesse checkout, os 151 testes, os 5 casos de navegador e o build de Pages passaram novamente após a integração.

Deployment de produção: `baae50c3-3964-4ed2-aed2-ff7352d2e251`, publicado em `https://baae50c3.imobiturbo-website.pages.dev`. A comprovação nesse endereço terminou em 2026-09-27 às 13:31:40, horário de Brasília. HTML, CSS e os dois arquivos JavaScript conferem byte a byte com o SHA integrado. As rotas `/vagas/` e `/vagas-v2/` também tiveram seus HTMLs públicos comparados com os respectivos arquivos da release.

**Domínio público confirmado:** `https://www.imobiturbo.com.br/vagas-obrigado/`, em 2026-09-27 às 13:36:47, horário de Brasília. O navegador recebeu HTTP 200; os quatro hashes da tabela acima também conferem nesse domínio, sem alteração do WAF.

- Endereço do deployment: interações aprovadas em 1440, 390, 320 e 580px.
- Domínio próprio: 1440×1000 e 390×844, com imagens carregadas, um único título principal visível, ausência de overflow horizontal e primeira ação dentro da tela inicial.
- Nos dois tamanhos do domínio próprio, os três botões abriram e fecharam o checkout, Escape devolveu o foco, o FAQ expandiu e a recusa levou a `#acessos`; o link do Club permaneceu presente. Nenhum erro de execução JavaScript foi observado.
- O executor da conferência foi a VPS3, conectada por túnel local temporário ao Chrome compartilhado. Somente a aba criada para a missão foi usada. Abas existentes foram preservadas; a aba da missão permaneceu aberta e o túnel foi encerrado.

Checkout da release: `/opt/builds/imobiturbo-website-release-upsell-9fccf7fa9ebd`. Evidências: `/opt/builds/imobiturbo-website-upsell-behance-20260927-evidence/release-9fccf7fa9ebd/`, incluindo `release-metadata.json`, logs, `public-pages/visual-interactions.json` e `public-domain/public-domain-verification.json`. Cópia local das capturas e metadados: `.impeccable/review/release-9fccf7fa9ebd/`.

Rollback identificado antes da publicação: SHA `dec4588`, deployment `fb642635-e747-454f-91b0-caf80413d4d8`, disponível em `https://fb642635.imobiturbo-website.pages.dev`.

Ocorrências resolvidas: o lock inicialmente ocupado foi aguardado sem interromper outro trabalho; o acesso SSH ao GitHub retornou `Permission denied (publickey)` e foi substituído por HTTPS com a credencial existente do `gh`, apenas no checkout da release. A edição do PR usou REST após erro de consulta a Projects classic. O primeiro teste no domínio selecionava o título oculto de confirmação; a inspeção do DOM comprovou a oferta correta e o seletor foi corrigido para `#offerTitle`, sem alteração na página. O cliente CDP utilizou o WebSocket nativo já disponível no Node da VPS3; nenhum pacote foi instalado para essa conferência.

Os testes de checkout usam APIs simuladas; nenhuma transação financeira real ou recebimento de venda no Hub é certificado por este trabalho.
