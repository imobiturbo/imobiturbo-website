# Brief de superfície — /bf-imobiliaria26/

Documento retrospectivo da implementação, em português; sem nova proposta visual.

- Público: corretores e operações imobiliárias preparando estoque, condições, campanha e atendimento para 27 de novembro de 2026.
- Objetivo da superfície: tornar o kit tangível, explicar a preparação e permitir comparar Essencial e Completo, mantendo toda a oferta e copy da implementação.
- Autoridade visual confirmada pelo usuário: https://mentoriaoprocesso.com/modelo-landing-page-low-ticket-personalizada/ e respectivo JSON Elementor (856, conforme comentário do HTML). Referência registrada, sem navegação externa nesta documentação.
- Método confirmado: code-led, template especificado, sem seed ou rodada de comps; mundo visual Imobiturbo v4.1 preservado.
- Jornada: hero → seis prévias → explicação operacional → catálogo com 20 materiais expansíveis → quatro bônus → comparação de planos → Natan Pimentel → quatro passos → oito FAQ → fechamento.
- Hero: duas colunas no desktop; uma coluna no mobile, com mockup entre descrição e benefícios. Logos do header realmente implementados em 56px/40px.
- Essencial — R$37,90: plano de preparação; SPIN Selling e negociação; Matriz de Oferta; kit de criativos e banco de ganchos; scripts de atendimento e follow-up; acesso ao material da edição 2026. Exclui os quatro bônus.
- Completo — R$47,90: tudo do Essencial + Calculadora de meta e verba + Roteiro de Lista VIP + Follow-up de 7 dias + Pack Últimas Horas. Diferença R$10; copy indica pagamento único, sem mensalidade.
- Representação: dois cards de planos brancos e bundles diferentes; quatro mockups de bônus distintos; seis páginas abertas ilustrativas e zoom em diálogo nativo acessível.
- Procedência: 14 WebP comprimidos (2 hero, 6 prévias, 4 bônus, 2 planos), derivados de quatro gerações GPT Image via Codex OAuth, runner oficial sem API key; manifesto registra referências anexadas, threads, SHA-256 e bytes.
- Prompts exatos: design/hero-prompt.txt, preview-prompt.txt, bonus-prompt.txt e plans-prompt.txt; cada WebP tem sidecar .webp.json com prompt e createdAt. Hero/prévias/bônus referenciam imagens locais do template; planos referenciam o hero gerado.
- Limite de produto: imagens são ilustrações de materiais digitais, não arquivos finais entregáveis ou envio físico. Não há prova de entrega nesta documentação.
- Limite de pagamento: offer.json mantém #checkout-pendente nos dois planos, apesar de salesEnabled:true; a nota diz que o checkout será conectado antes da publicação. Não considerar pagamento configurado.
- Revisão: um único problema de contraste encontrado, corrigido no rótulo pequeno dos bônus com --it-accent-700 (#467025). A única correção de cor principal não altera layout. Demais capturas preservam o layout da primeira captura, conforme conferência da implementação.
- Estado: correção de contraste resolvida na revisão independente; rótulos #467025 sobre branco alcançam 5,83:1. Disposition: ship, restrita à correção pontuada. Publicação será provada separadamente.

Fontes lidas no worktree `/home/natan/Projetos/.worktrees/imobiturbo-website/bf26-tangible-redesign-20261002`: PRODUCT.md, DESIGN.md; bf-imobiliaria26/index.html, css/low-ticket.css, css/tokens.css, js/presentation.js, js/low-ticket.js, offer.json, design/assets-manifest.json, quatro prompts e estrutura dos 14 sidecars.
Capturas reais inspecionadas em `.impeccable/review/`: desktop.png, mobile.png, desktop-bonus.png, desktop-pricing.png. Evidência estática; nenhum browser ou teste interativo foi executado nesta tarefa.
