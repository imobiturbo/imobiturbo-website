# Entrega — prévia da LP vagas — 2026-09-13

## Estado comprovado

Prévia responsiva concluída após os 37 protótipos visuais. Design system ajustado, código das 13 seções, revisão Impeccable com sete correções e auditoria de preenchimento com formatos desktop/mobile. A contratação permanece desabilitada enquanto preço, condições e checkout estiverem pendentes.

Prévia, galeria e auditoria:
https://vagas-modulos-20260913.imobiturbo-website.pages.dev/

Deployment imutável:
https://5e2714e2.imobiturbo-website.pages.dev/

PR em rascunho:
https://github.com/imobiturbo/imobiturbo-website/pull/1

## Preservação e arquivos

- Backup anterior restaurável: `/mnt/e/backups/imobiturbo-website/vagas-antes-redesign-20260913-050042` (Windows `E:\backups\imobiturbo-website\vagas-antes-redesign-20260913-050042`).
- Backup contém 499 arquivos fonte, bundle Git validado, espelho publicado com 39 arquivos, capturas desktop/mobile e snapshots do DS/clone anterior. Extração real testada antes das alterações.
- S25: `/storage/emulated/0/Download/LP-vagas-20260913/`. Os 93 arquivos do pacote foram comparados por SHA-256 com a origem, todos idênticos; `ABRIR.txt` adicional contém o link da prévia. A pasta original `Download/prompts/` foi preservada.
- Protótipos canônicos: `/home/natan/Projetos/open-design/.od/projects/lp-vagas-imobiturbo-clone/prototipos-20260913/`.
- Código: `/home/natan/Projetos/.worktrees/imobiturbo-website/vagas-modulos-20260913`, branch `feat/vagas-modulos-20260913`.
- DS sincronizado em `open-design/design-systems/imobiturbo/` e `.od/projects/imobiturbo-design-system/`. 21 assets atuais, perfil da LP e referência visual. As 279 exclusões manuais do repositório fonte foram preservadas. A marca clara principal foi retida no snapshot com origem documentada.

## Sequência executada

1. Backup e restauração de amostra, antes de editar.
2. Ajuste do DS, referência visual e validação do manifesto real na VPS3: `ok: true`, 13 caminhos existentes.
3. 37 quadros revisados, gerados um por chamada pelo caminho canônico Codex/OAuth com referência visual. Duas marcas desktop foram corrigidas em novas imagens, preservando os originais: 39 gerações bem-sucedidas no total. Uma tentativa anterior sem imagem ficou registrada. Não houve API paga ou fallback de provedor.
4. HTML/CSS iniciado somente após o conjunto completo revisado. Sem framework novo; menu/FAQ nativos e logos oficiais sem alteração dos bytes.
5. Impeccable por seção, detector único e revisão independente gpt-5.6-luna/max. Sete achados corrigidos; parecer final `disposition: ship`.
6. Auditoria das 13 seções, candidatos reais já existentes e prompts para preencher mídias/painéis. Dimensões dos assets são distintas das pranchetas mobile.

## Provas de validação

- Código construído: `79ca7a555e5c5650e0f498c9c6461b83dc580d67`, checkout limpo na VPS3 sob `/var/lock/imobiturbo-ci.lock`.
- TDD focado: quatro testes vermelhos na LP anterior e quatro verdes na implementação. Build Pages e testes finais concluídos com exit 0.
- SHA-256 HTML: `29d1e84fdc1304aa6f03f772defb1424f5aaa4208168cee2c233c233491a2499`.
- SHA-256 CSS: `de7a6d302a754ccd4ba3b1b71e46f6e7e2eb8614d33d612799a9fcca3e5a8e7d`.
- Artefato estático publicado pela VPS3 em branch de preview: `5e2714e2-3519-4a9e-81a0-aee67d0afe7f`; sem worker ou API. Os 92 arquivos servidos foram comparados byte a byte com o pacote; todos idênticos. `_headers` é configuração, não arquivo público.
- Chromium na URL publicada: HTTP 200, 13 seções, quatro logos e fonte carregadas; 1440/768/390/320 px sem overflow. Oito FAQ, primeiro aberto; menu por teclado, foco, skip link e contratação desabilitada conferidos. Nenhum script/formulário na LP, nenhum erro de página. Galeria com 37 imagens e auditoria com sete blocos copiáveis funcionando.
- Produção preservada no deployment `79a3e333-b163-491c-98f9-75522d745df9`. HTML público igual ao backup após normalizar somente os metadados variáveis `window.__CF$cv$params`.

As evidências estão em `.impeccable/review/` no worktree e em `imobiturbo-infra/data/prompts-vagas-20260913/`. Ver também `IMPLEMENTACAO.md`, `REVISAO-VISUAL.md` e `AUDITORIA-E-PROMPTS.md`.

## Limitações e preenchimento seguinte

As imagens retornadas têm aproximadamente 1672×941 desktop e 941×1672 mobile, não as resoluções maiores pretendidas nos briefs. O runtime completo do OpenDesign não foi comprovado; manifesto e referência estática foram verificados. O detector Impeccable operou degradado por ausência de parsers, e seus findings de fonte/grid correspondem a requisitos explícitos dos briefs.

Restam vídeos/capturas reais, retrato, relatos, trechos de conversa/IA/exercício/guia, condições comerciais e dados institucionais listados na auditoria. Os prompts de geração não substituem a fonte factual desses materiais. Esta entrega é a prévia revisável; a oferta antiga continua ativa. O passo de produto seguinte é preencher os itens auditados antes de ativar a nova contratação.
