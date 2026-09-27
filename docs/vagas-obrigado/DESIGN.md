---
name: "Imobiturbo — Consultoria pós-compra"
description: "Upsell opcional em preto e lima, com decisão clara e continuidade de marca."
colors:
  bg: "#000000"
  text: "#f4f6ef"
  muted: "#b7bcae"
  accent: "#c5ff5e"
  accent-hover: "#d8ff91"
  line: "#2f400d"
  panel: "#10150a"
  danger: "#ffa8af"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(32px, 3.5vw, 46px)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 750
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "23px"
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  action:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.4
  price:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "74px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.action}"
    rounded: "{rounded.sm}"
    padding: "15px 22px"
    height: "58px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  input-field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "12px"
    height: "47px"
  offer-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "30px 24px 18px"
---

# Design System: Imobiturbo — Consultoria pós-compra

## Overview

**Creative North Star: "Hierarquia Inside Circle dentro da identidade Imobiturbo"**

A rota aplica a hierarquia da referência Inside Circle à jornada pós-compra da Imobiturbo. A proposta aparece como uma escolha contextual entre a compra da comunidade e os acessos, usando a identidade escura de alto contraste já presente no CSS desta página. Esta descrição registra a direção fornecida e implementada; não declara um conceito-semente nem uma exploração aleatória.

A composição começa com a etapa da jornada, um alerta e um título centralizados, a foto real de Natan e as opções de aceitar ou seguir. Depois apresenta o argumento da consultoria, três frentes de trabalho, o cartão dedicado ao preço e o checkout opcional. A seção de acessos permanece independente da consultoria.

**Key Characteristics:**

- Preto absoluto como fundo da rota, com textos claros e superfícies em verde escuro.
- Lima reservado à ação principal, aos destaques e aos ícones SVG.
- Plus Jakarta Sans local em toda a hierarquia.
- Decisão de aceitar ou recusar visível logo após o convite pessoal.
- Foto existente de Natan e logo oficial reutilizada sem alteração.

## Colors

A paleta desta rota é a versão escura da identidade Imobiturbo: base preta, texto claro, lima para ação e verdes profundos para superfícies e divisórias.

### Primary

- **Acento Limão:** `{colors.accent}` marca a ação primária, o passo atual, ícones e trechos destacados; o texto do CTA usa `{colors.bg}`.
- **Lima de interação:** `{colors.accent-hover}` aparece no hover do botão principal.

### Neutral

- **Fundo preto:** `{colors.bg}` mantém o contraste da página.
- **Texto principal:** `{colors.text}` sustenta títulos e conteúdo de alta prioridade.
- **Texto secundário:** `{colors.muted}` organiza parágrafos e instruções sem competir com os títulos.
- **Divisória verde:** `{colors.line}` delimita painéis, checkout e acessos.
- **Painel verde-preto:** `{colors.panel}` separa cartões do fundo.
- **Erro de formulário:** `{colors.danger}` identifica mensagens de falha no checkout.

### Named Rules

**The Lime Action Rule.** O lima destaca ações e estados; no botão primário, o texto permanece preto para conservar contraste.

## Typography

**Display / Body Font:** Plus Jakarta Sans local (sans-serif)
**Label/Mono Font:** Plus Jakarta Sans; a página não define uma família mono própria.

**Character:** A família única dá continuidade à marca e sustenta títulos compactos, texto legível e valores de preço com presença.

### Hierarchy

- **Display** (800, `{typography.display.fontSize}`, `{typography.display.lineHeight}`): título principal da proposta; em telas até 680px o CSS aplica uma escala móvel própria.
- **Headline** (750, `{typography.headline.fontSize}`, `{typography.headline.lineHeight}`): títulos de argumento, benefícios e resumo do checkout.
- **Title** (`{typography.title.fontSize}`, line-height `{typography.title.lineHeight}`): títulos dos resultados e do cartão da oferta.
- **Body** (16px, line-height 1.65): introdução e leitura principal; textos de apoio reduzem para 12–15px conforme a função.
- **Label** (12px, line-height 1.6): instruções e texto auxiliar.
- **Preço** (74px, weight 800): o valor da consultoria recebe a maior ênfase numérica; o CSS usa numerais lining.

### Named Rules

**The One Typeface Rule.** Plus Jakarta Sans local cobre títulos, texto, controles e valores; não introduza uma segunda família nesta rota.

## Layout

A página segue um eixo central de leitura e um funil de decisão. A primeira dobra contém uma barra de jornada com largura máxima de 640px, logo centralizado, alerta, headline, convite fotográfico e CTA acompanhado pela recusa. O conteúdo usa contêineres de até 1000px; a introdução limita a linha a 630px, o convite a 720px e a decisão inicial a 520px.

A seção final combina argumento e preço em duas colunas. A grade de três benefícios também usa três colunas em telas largas. Até 900px, os intervalos entre colunas diminuem; até 680px, os benefícios e o cartão de preço passam a uma coluna enquanto o checkout abre em um dialog nativo de uma coluna, com até 520px de largura e rolagem interna. Até 360px, os rótulos da jornada e o CTA recebem ajustes adicionais. A página não declara uma escala global de espaçamento; os valores permanecem os que o CSS usa em cada bloco.

**The Journey Context Rule.** A proposta e as opções de aceitar ou recusar permanecem juntas no início; o caminho para os acessos continua disponível depois.

## Elevation & Depth

A profundidade vem principalmente de planos tonais: fundo preto, gradiente verde discreto na abertura e seções escuras diferenciadas por bordas. O convite fotográfico usa sombra ampla e suave; o modal de checkout integrado usa sua própria sombra, fundo escurecido e desfoque do conteúdo atrás. Os demais cartões usam fundo e contorno para se separar; não há uma escala geral de sombras nesta rota.

### Shadow Vocabulary

- **Convite fotográfico:** `0 20px 50px #0005` separa suavemente a imagem do fundo sem criar uma sombra dura.

## Shapes

A forma é arredondada e contida. Botões e campos usam `{rounded.sm}`; o convite e o painel de argumento usam `{rounded.md}`; o cartão de preço usa `{rounded.lg}`. O modal de checkout usa 24px no desktop e 20px no mobile. Bordas finas definem os cartões. A barra de progresso é baixa e arredondada, e os números da jornada ficam em círculos pequenos.

## Components

### Buttons

- **Character:** ações diretas, contrastantes e fáceis de identificar.
- **Primary:** fundo `{colors.accent}`, texto `{colors.bg}`, altura de 58px no CSS-base e 56px no breakpoint móvel; aparece nos dois pontos de contratação e no checkout.
- **Hover / Active:** o hover clareia o fundo e eleva o botão em 2px; active retorna à posição inicial.
- **Focus:** contorno visível de 3px na cor de ação, afastado 4px do controle.
- **Decline:** link sublinhado em texto neutro, colocado junto da oferta sem competir com o CTA.
- **Access:** links de Club e CRM usam contorno, não o preenchimento do botão primário.

### Cards / Containers

- **Personal invite:** cartão horizontal com a foto real de Natan, texto sobre gradiente e identificação da consultoria. A origem é `/assets/natan-studio.jpg`.
- **Offer card:** destaca modalidade, R$497 à vista e a alternativa de 12 parcelas de R$49 (R$588 no total) em um bloco próprio.
- **Argument / checkout:** painéis escuros com contorno verde e conteúdo espaçado.
- **Acessos:** bloco de continuidade separado por uma divisória; não depende da compra da consultoria.

### Inputs / Fields

- **Style:** campo-base escuro, contorno neutro e forma `{rounded.sm}`. No checkout em modal, a variante usa altura mínima de 44px, raio de 9px, fonte de 14px e fundo `#11130f`.
- **Focus:** contorno de ação visível.
- **Error:** mensagens de falha usam `{colors.danger}`.

### Navigation

A barra de jornada mostra Comunidade, Oferta especial e Seus acessos. O segundo passo recebe o destaque de estado atual e uma barra de progresso indica a etapa 2 de 3.

### Signature Components

- **Outcomes:** três colunas apresentam CRM, IA e cadência, e primeira campanha; em telas estreitas elas viram uma lista vertical.
- **Inline SVG:** ícones próprios usam preenchimento vazio, traço 1.8 e terminais arredondados, com lima como cor de destaque.
- **Brand assets:** a logo `/assets/brand/theme-dark/logo-imobiturbo.webp` e a foto `/assets/natan-studio.jpg` são arquivos existentes, usados sem alteração.

**The Honest Offer Rule.** Exiba duração, preço e forma de pagamento com clareza; o agendamento na agenda só aparece após a aprovação do pagamento da consultoria.

## Do's and Don'ts

- **Do:** mantenha o fundo escuro, o CTA lima com texto preto e a tipografia local desta rota.
- **Do:** mantenha o convite pessoal e as opções de aceitar ou recusar juntos na abertura.
- **Do:** use os ícones SVG da página com traço consistente e estados de foco visíveis.
- **Do:** mantenha separados o pagamento da consultoria, o agendamento e os acessos da comunidade.
- **Don't:** invente escassez, desconto, garantia ou prazo promocional para vender a consultoria.
- **Don't:** sugira que comprar a consultoria seja condição para acessar a comunidade.
- **Don't:** acrescente vídeo ou controle de reprodução sem um ativo de vídeo ligado a essa experiência.
- **Don't:** use texto branco sobre o CTA lima nem substitua a tipografia oficial por uma fonte genérica.

## Integração com o checkout

O PR #17 trouxe o dialog de pagamento, o parcelamento e a agenda; estes fluxos foram preservados ao integrar a composição visual. Os dois CTAs abrem o mesmo modal. Fechar pelo botão, pela área externa ou por Escape devolve o foco ao acionador. O seletor alterna cartão à vista (R$497) ou 12 parcelas de R$49 (total R$588); Pix permanece R$497. A liberação da agenda depende do pagamento aprovado. O comprador confirma o horário disponível na agenda; pagar não reserva automaticamente.
