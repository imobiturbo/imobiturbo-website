# Nova LP vagas — implementação de prévia

## Escopo

13 seções responsivas reconstruídas a partir de 37 protótipos visuais gerados sequencialmente. HTML semântico, CSS local, Plus Jakarta Sans, logos oficiais e FAQ nativo. Código iniciado somente após a geração e revisão de todos os quadros. Sem framework novo.

O fluxo solicitado foi: backup → ajuste do design system → imagens com referência visual → código → Impeccable por seção → auditoria de preenchimento.

## Backup restaurável

Destino: `/mnt/e/backups/imobiturbo-website/vagas-antes-redesign-20260913-050042`.

- Fonte anterior: `4ba4f76c15f4f27c6beabae91a5aa4da1aa139d7`.
- 499 arquivos da fonte comparados por SHA-256; histórico Git em bundle verificado.
- Espelho publicado com 39 arquivos e capturas desktop/mobile.
- Extração real do arquivo de backup conferiu HTML, CSS, tracking e backend de checkout.
- Snapshots adicionais do DS OpenDesign, clone antigo e assets restantes após a limpeza.

## Design system e imagens

DS ajustado em `/home/natan/Projetos/open-design/.od/projects/imobiturbo-design-system/` e sincronizado com `open-design/design-systems/imobiturbo/`. Manifesto validado pelo schema real na VPS3; 13 caminhos declarados existentes. As 279 remoções manuais do repositório fonte do DS foram preservadas. A marca principal clara foi mantida somente no snapshot e sua origem documentada. A validação da interface foi feita pela referência estática; o runtime completo do OpenDesign não foi comprovado nesta execução.

Prompts originais importados do S25 de `/storage/emulated/0/Download/prompts/`.

Conjunto visual: `/home/natan/Projetos/open-design/.od/projects/lp-vagas-imobiturbo-clone/prototipos-20260913/`.

- `index.html`: galeria dos 37 quadros.
- `manifest.json`: prompts, hashes, dimensões, referência e ordem de execução.
- `visual-review.json`: revisão de cada quadro.
- `images/`: 37 referências selecionadas; versões originais das duas imagens corrigidas preservadas.
- `01-D-v2.png` e `13-D-v2.png`: marcas corrigidas via edição nativa com arquivo oficial anexado.

Foram 39 imagens bem-sucedidas pelo caminho Codex/OAuth do executor GPT Image 2.5, sem API paga ou fallback. A saída real é aproximadamente 1672×941 desktop e 941×1672 mobile, proporções 16:9 e 9:16. Resoluções pretendidas eram 2560×1440 e 1440×2560; não alegar entrega nessas dimensões.

## Comportamento da prévia

Os CTAs de navegação apontam para a seção da assinatura. A contratação está desabilitada porque preço, condições e checkout continuam pendentes nos briefs. Não há scripts de tracking, formulários, players ou mensagens fictícios. Mídias pendentes são espaços identificados. A página declara noindex. Não substituir a oferta ativa por esta prévia sem preencher e verificar esses itens.

FAQ com oito perguntas e primeira aberta inicialmente. Respostas adicionais usam fatos já declarados nos prompts e pendências explícitas. Menu mobile e FAQ usam elementos nativos, com teclado e foco visível.

Recortes mobile são reunidos em fluxo contínuo. Na hero o vídeo vem antes do CTA. Logos preservam bytes oficiais; CSS enquadra apenas suas margens transparentes.

## Verificação

- TDD na VPS3: quatro testes inicialmente vermelhos sobre a LP antiga e quatro verdes na nova prévia; `node --test tests/vagas-preview.test.js`, exit 0.
- Chromium: 1440, 768, 390 e 320 px; zero overflow horizontal, quatro logos carregadas, oito FAQ e uma aberta, sem erros de página.
- Capturas reais das 13 seções em desktop/mobile e reprodução da hero em 1672×941. Primeira tentativa de captura por seletor retornou branco e foi descartada; evidência válida recapturada diretamente no Chromium.
- Detector Impeccable executado uma vez, em modo degradado por ausência de parser. Findings de Plus Jakarta Sans e grid são exceções requeridas pelos briefs.
- Polimento: contraste do título verde sobre superfície ajustado para #649D3C (3.081:1); legendas da mídia de depoimento ampliadas.
- Revisão independente e build final registrados ao concluir a validação.

A auditoria e os prompts de preenchimento estão em [AUDITORIA-E-PROMPTS.md](AUDITORIA-E-PROMPTS.md).
