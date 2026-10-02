---
name: Imobiturbo — BF Imobiliária 2026
description: Documentação da implementação da rota /bf-imobiliaria26/.
colors:
  lime: "#c5fe6d"
  sage: "#69a438"
  sage-hover: "#5a8f2e"
  sage-label: "#467025"
  noble: "#2f400d"
  obsidian: "#09090b"
  white: "#ffffff"
  ink: "#000000"
  paper: "#f4f4f5"
  muted-light: "#52525b"
  muted-dark: "#c6c6ce"
  line: "#e5e5e5"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(42px, 4.5vw, 64px)"
    fontWeight: 800
    lineHeight: 1.18
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  price:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  card: "12px"
  panel: "16px"
---
# Design da rota /bf-imobiliaria26/

## Overview
Registro descritivo da implementação final; escopo exclusivo desta rota, sem substituir PRODUCT.md ou DESIGN.md globais.
Preservar Imobiturbo v4.1: clareza operacional, legibilidade 40+, identidade oficial e famílias tipográficas locais.
A composição segue o template exato e o JSON Elementor determinados pelo usuário; execução orientada pelo código, sem rodada de seed ou comp.
A oferta e a copy existentes são invariantes; estratégia e conteúdo dos kits estão no SURFACE-BRIEF.md.

## Colors
Limão destaca títulos e ações em seções escuras, com texto preto nos botões; sage serve a ações e ícones em superfícies claras.
Verde nobre sustenta a faixa superior e a recomendação do Completo; obsidian alterna com branco e papel para separar capítulos.
**Regra do rótulo legível.** Os rótulos pequenos dos bônus usam sage-label, via --it-accent-700; correção final implementada do único problema de contraste encontrado na revisão.
Os valores acima vêm de css/tokens.css v4.1 e css/low-ticket.css; não normalizar para os hex históricos diferentes descritos no DESIGN.md global.

## Typography
Plus Jakarta Sans local em títulos, corpo, legendas e ações; JetBrains Mono local em preços e faixa de data. Playfair não é usada nesta superfície.
Títulos têm peso 800; h2 varia de 32 a 44px; corpo descritivo geralmente 16–18px; botões 19px/700.
No mobile, o hero usa clamp(36px, 9.6vw, 48px), mantendo título centralizado e leitura contínua.

## Layout
Container máximo de 1200px, largura calc(100% - 64px); até 760px, calc(100% - 40px). Seções: 96px verticais, 64px no mobile.
Hero desktop em duas colunas (.96fr / 1.08fr): texto e ação à esquerda, coleção ilustrativa à direita.
Até 760px, uma coluna: título → descrição → mockup → benefícios → CTA → nota de preço.
Logo oficial no header: altura 56px desktop e 40px mobile; rodapé: 48px/36px, com proporção preservada e variante para fundo escuro.
Breakpoints reais: 1050px reduz catálogo, bônus e passos para duas colunas; 760px empilha hero, planos e autoridade; 540px empilha catálogo, bônus e passos.
Planos ocupam duas colunas dentro de 960px; mobile em coluna única com máximo 460px.
Galeria horizontal com scroll-snap, itens de 274px desktop e 250px mobile; troca do raster do hero acontece separadamente aos 600px.

## Elevation & Depth
A separação principal usa alternância tonal e bordas finas; volume vem dos packshots ilustrativos.
Duas páginas demonstrativas têm sombra (0 16px 36px, preto a 20%); diálogo tem backdrop preto a 75%.
Barra móvel usa sombra discreta (0 8px 28px, preto a 22%); não adicionar sombras universais aos cards.

## Shapes
Botões e cards de bônus têm cantos de 12px; cards de planos, retrato e diálogo usam 16px.
Controles da galeria e fechamento são circulares (48px); prévias preservam páginas 2:3 e bônus/planos preservam imagens quadradas.

## Components
Seis prévias de páginas abertas ilustrativas, com legendas e botão de zoom; duas delas reaparecem na explicação operacional.
Zoom em dialog nativo com showModal, nome via aria-labelledby, imagem/alt da prévia, botão nomeado de fechar e fechamento ao clicar fora; Escape usa comportamento nativo.
Galeria navega por botões e setas do teclado quando focada; respeita prefers-reduced-motion.
Catálogo com 20 disclosures inline em details/summary; FAQ com oito disclosures nativos; ícone de abertura gira 45°.
Quatro bônus possuem mockups gerados distintos, cards brancos e descrições próprias sobre seção escura.
Dois planos usam cards brancos, bundles visualmente distintos e conteúdos diferentes; Completo recebe borda sage e selo verde nobre.
SVG compartilhado por symbol/use: stroke 1.7, pontas e junções arredondadas, currentColor; tamanhos adaptados à função.
Foco visível de 3px com offset 5px; limão nas seções escuras; skip-link leva aos planos.
Transições de 0.2s com cubic-bezier(.16,1,.3,1); movimento reduzido remove animações/transições e suavização.

## Do's and Don'ts
- Preservar tokens v4.1, logos oficiais, composição especificada, copy e diferenças entre os kits.
- Preservar sage-label nos rótulos pequenos dos bônus; não retornar ao sage mais claro.
- Manter identificação ilustrativa, proporções, legendas, teclado e semântica nativa.
- Não tratar packshots ou páginas geradas como materiais finais entregues, envio físico ou prova de resultado.
- Não afirmar checkout conectado ou entrega validada; os links preexistentes continuam placeholders.
- Não promover esta composição ao sistema global. A revisão independente resolveu a correção de contraste (5,83:1), sem pendências nessa correção; a prova de publicação é separada.
