---
name: Imobiturbo — Consultoria individual
description: Sistema visual da rota /vagas-obrigado/.
colors:
  primary: "#c5ff5e"
  background: "#0e100d"
  foreground: "#f4f6ef"
  muted: "#b7bcae"
  divider: "#394032"
  panel: "#171b14"
  danger: "#ffa8af"
  paper: "#f6f7f2"
  ink: "#17200f"
  paper-muted: "#505a46"
  paper-divider: "#d8dece"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(38px, 4.05vw, 58px)"
    fontWeight: 800
    lineHeight: "1.12"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(32px, 3.15vw, 46px)"
    fontWeight: 750
    lineHeight: "1.12"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "16px"
    lineHeight: "1.65"
rounded:
  button: "10px"
  portrait: "14px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#10120d"
    rounded: "{rounded.button}"
    padding: "16px 22px"
    height: "58px"
---

# Design System: Imobiturbo — Consultoria individual

## Overview

Fotografia real, títulos diretos e alternância de superfícies escuras, claras e limão. A identidade existente da Imobiturbo orienta a composição editorial e o contraste. Este documento abrange somente esta rota; o DESIGN.md da raiz permanece como referência das demais superfícies.

## Colors

O limão é o acento de títulos, ações e faixa de destaque. Texto escuro acompanha superfícies limão. O fundo escuro e os painéis têm leve componente verde; o papel claro sustenta as seções explicativas e as perguntas. A seção de processo usa branco puro. Divisórias discretas organizam o conteúdo sem criar uma grade de cartões.

## Typography

Plus Jakarta Sans é servida localmente por /fonts/PlusJakartaSans-Variable.ttf. A família se mantém em títulos, corpo, preços e controles desta rota. Os títulos têm peso alto e entreletra compacta. O corpo preserva entrelinha ampla.

Em telas de até 680px, o título principal usa clamp(31px, 8.5vw, 42px), entrelinha 1.15; os títulos secundários usam 32px. O texto inicial usa 16px. Condições de pagamento e notas permanecem separadas do preço. Não substituir a fonte oficial em resposta a alertas genéricos de saturação tipográfica.

## Layout

Container de até 1160px, com 64px de respiro horizontal total. O hero tem título centralizado e uma composição interna de até 1032px: texto e ação à esquerda, retrato à direita; proporção 1.06fr/1fr e intervalo de 72px.

Os ajustes intermediários começam em 900px. Até 680px, as colunas se empilham, o preço e a ação precedem o retrato e o respiro total cai para 40px. Até 360px, o respiro é de 32px. O processo passa de três colunas a uma sequência vertical. A faixa de etapas permanece com três posições.

## Elevation & Depth

As seções usam contraste de superfície, com bordas finas no bloco final de contratação. A fotografia traz a profundidade do hero; um degradê escuro localizado sustenta a legenda. O checkout existente mantém sua própria superfície, sombra e fundo desfocado de 12px. Não acrescentar sombras decorativas aos textos ou seções.

## Shapes

Botões têm cantos suaves. Retrato e oferta final usam cantos de 14px; o retrato passa a 12px no celular. Números das etapas usam círculos. As seções explicativas são abertas, com separadores horizontais.

## Components

**Ações.** O botão principal usa texto escuro e seta SVG, com altura mínima de 58px no desktop e 56px no celular. Hover altera a cor, sem deslocar o botão. Há três pontos de abertura do mesmo checkout. A alternativa de seguir para os acessos é sublinhada e visível.

**Etapas.** A etapa atual usa limão e aria-current. O estado de pagamento da comunidade é informado em uma faixa independente.

**Retrato.** Utilizar o arquivo existente de Natan, sem substituir rosto, logotipo ou composição por material gerado. Legenda com nome, função e frase curta, adaptada à largura disponível.

**Perguntas.** Usar details/summary nativos, divisórias e ícone SVG que muda quando a resposta está aberta. Links, botões e resumos têm foco visível; nas superfícies claras, o contorno é escuro.

**Checkout.** Preservar o dialog, largura máxima de 490px, controles e mensagens existentes. Os botões de oferta acionam o mesmo fluxo Pix/cartão. A aparência da página não modifica a autorização de pagamento ou a liberação da agenda.

**E-mail de acesso.** Acima dos botões do Club e CRM, um painel discreto destaca o e-mail original da compra da comunidade, quando disponível na sessão. O endereço usa texto selecionável, de 20 a 28px, e quebra de linha inclusive em telas de 320px. Um e-mail diferente informado na consultoria não substitui esse endereço. Sem o perfil válido, manter a orientação geral; a confirmação do pagamento continua independente.

**Movimento.** Rolagem suave e transição de cor de 0.18s no botão. Respeitar prefers-reduced-motion.

## Do's and Don'ts

Manter o retrato e o logotipo originais, a fonte local, contraste alto, preços legíveis e reflow em uma coluna no celular. Manter a alternativa de recusa e os acessos identificáveis.

Não inserir depoimentos, vídeo, escassez, garantias ou números de resultado sem conteúdo confirmado. Não transformar condições de parcelamento em promessas de pagamento sem juros. Não substituir a identidade por azul/roxo ou efeitos de vidro genéricos.
