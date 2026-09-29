# Prompts — revisão em fitas cassete

Solicitação: 29/09/2026. Todas as imagens são GPT Image 2.5, executadas pelo caminho Codex OAuth definido em `imobiturbo-infra/docs/operacao/ambiente-agentes.md`. Não houve troca de modelo.

A imagem hero usa a hero anterior, a pilha de fitas enviada pelo usuário e o ícone oficial como referências. A primeira capa usa o estojo transparente vertical da referência e o ícone oficial. As outras nove usam somente a primeira capa gerada como matriz, alterando o título, o resumo e os três benefícios. As capas têm fundo transparente real e proporção 3:4.

Os arquivos de texto deste diretório registram os prompts efetivamente enviados. As capas ilustram dez tarefas do catálogo aprovado, mapeadas em `../cassette-covers.json`, sem produzir o conteúdo das skills. Assinaturas de plataformas e fitas físicas não compõem a oferta.

Mestres PNG, referências e logs: `/home/natan/Projetos/imobiturbo-infra/output/skills-ia-cassettes-20260929/`. Imagens de uso no site: `assets/skills-ia/cassettes/`, além da hero e sua versão mobile.

Estrutura de prompting baseada na skill de Serge Shima, https://github.com/smixs/visual-skills, CC BY 4.0. Referência de identificação da plataforma Grok: https://x.ai/legal/brand-guidelines.

## Validação da revisão

- Dez mestres PNG em 1086×1448 (3:4), todos com pixels transparentes e opacos. SHA-256, dimensões e tamanhos em `asset-manifest.json`.
- Dez WebP em 480×640 preservam o canal alfa: 565.120 bytes no total. Hero desktop de 136.972 bytes e mobile de 50.904 bytes.
- 174 testes passaram na VPS3, incluindo virada da data de Brasília e retorno de aba suspensa.
- Navegador na VPS3: 360, 390, 768 e 1440px, sem overflow ou imagens quebradas; loop, pausa, setas do teclado, movimento reduzido e navegação sem JavaScript verificados.
- Screenshots e relatório de navegador: diretório `evidence/` da missão.
