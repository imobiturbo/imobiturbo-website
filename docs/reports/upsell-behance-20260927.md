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

Revisão independente em andamento com o agente Anscombe (`01a0e39d-afc2-79b1-b927-c9db18b07d55`). O veredito deve ser registrado antes da integração.

O detector apontou somente três ocorrências de fonte frequente no mercado. Plus Jakarta Sans é uma escolha explícita de `PRODUCT.md` e foi mantida. Não existe composição gerada aprovada nem sorteio de conceito: a execução adapta diretamente as referências escolhidas pelo usuário.

Sistema visual: `vagas-obrigado/DESIGN.md` e `.impeccable/surfaces/vagas-obrigado/design.json`. Proveniência dos ativos: `docs/design/vagas-obrigado-assets.md`. Os documentos da raiz e os arquivos de imagem existentes foram preservados.

## Publicação e limite da prova

Baseline de produção confirmado antes desta release: SHA `dec4588`, deployment `fb642635-e747-454f-91b0-caf80413d4d8`, disponível em `https://fb642635.imobiturbo-website.pages.dev` como referência de rollback.

A release deve partir do SHA integrado, em checkout limpo na VPS3, sob `/var/lock/imobiturbo-ci.lock`. A evidência final deve registrar SHA, deployment, domínio público, arquivos servidos e interações no navegador. Uma resposta 403 com `cf-mitigated: challenge` no acesso direto da VPS3 é tratada como desafio do Cloudflare, sem substituir a verificação por navegador.

Os testes de checkout usam APIs simuladas; nenhuma transação financeira real ou recebimento de venda no Hub é certificado por este trabalho.
