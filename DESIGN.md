---
name: Imobiturbo Design System (Rebranding 2026)
description: Identidade visual oficial 2026 — Preto puro (#000000), Acento Limão (#C5FF5E), Verde Intermediário (#6CA438), Verde-Escuro Nobre (#2F400D), Off-White (#FAF9F6) e tipografia Plus Jakarta Sans.
colors:
  primary: "#C5FF5E"
  primary-hover: "#D8FF85"
  primary-press: "#B2F040"
  accent-light: "#6CA438"
  dark-green: "#2F400D"
  neutral-bg: "#000000"
  neutral-surface: "#0A0A0A"
  neutral-surface-raised: "#141414"
  neutral-card: "#1F1F1F"
  light-canvas: "#FAF9F6"
  light-surface: "#FFFFFF"
  text-primary: "#FFFFFF"
  text-dark-primary: "#000000"
  text-muted: "#B8B8B8"
  text-dark-muted: "#555555"
typography:
  display:
    fontFamily: ""Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: ""Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: ""Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  mono:
    fontFamily: ""JetBrains Mono", ui-monospace, Menlo, monospace"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
  space-8: "64px"
  space-9: "96px"
  space-10: "128px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    fontWeight: 800
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Imobiturbo (Rebranding 2026 Oficial)

> Consulte o arquivo canônico [MANUAL_DE_MARCA.md](MANUAL_DE_MARCA.md) para a matriz completa de regras.

## 1. Visão Geral

Imobiturbo é o hub de aceleração comercial e sistema operacional para corretores de imóveis, imobiliárias e incorporadoras. A identidade 2026 equilibra autoridade institucional com energia de conversão comercial.

**Postura Visual:**
- **Modo Claro (Padrão de Landing Pages e Vagas):** Fundo limpo Off-White (`#FAF9F6` / `#FFFFFF`), sem texturas quadriculadas cinzas sujas. Destaques e textos no **Verde Intermediário (`#6CA438`)**. Botões de CTA em **Limão Fluor (`#C5FF5E`)** com texto estritamente preto (`#000000`).
- **Modo Escuro (Cockpit & Portal):** Preto puro (`#000000`) com acentos em Limão Fluor (`#C5FF5E`).
- **Containers de Autoridade:** Verde-Escuro Nobre (`#2F400D`) exclusivo para backgrounds e cards especiais (ex.: plano anual, mentoria).

## 2. Tipografia Oficial

- **Fonte Primária Única (Display, Títulos, Subtítulos, UI e Textos):** `Plus Jakarta Sans`
  - Pesos: Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800.
  - Casing: Sentence case em títulos e botões. Proibido forçar caixa alta (ALL CAPS) em botões e parágrafos.
- **Fonte de Dados & Números:** `JetBrains Mono`
  - Usada em valores financeiros (R$), VGV, contadores e tabelas de métricas.
- **PROIBIÇÃO ABSOLUTA:** Jamais utilizar fontes antigas do projeto como `Futura`, `Barlow Condensed`, `Inter` ou `Oswald`.

## 3. Matriz de Cores

- **`#C5FF5E` (Limão Fluor):** Acento primário de ação e conversão. **Sempre com texto `#000000` em negrito**.
- **`#6CA438` (Verde Intermediário da Marca):** Destaques, grifos de palavras-chave, ícones e bordas em **FUNDO CLARO**.
- **`#2F400D` (Verde-Escuro Nobre):** Exclusivamente para **FUNDO DE CONTAINERS** escuros de autoridade. Nunca como texto em fundo branco.
- **`#000000` (Preto Absoluto):** Textos principais no claro e canvas no noturno.
- **`#FAF9F6` (Off-White Nobre):** Canvas do modo claro.
- **`#FFFFFF` (Branco Puro):** Cards e superfícies no modo claro; textos nobres sobre containers verdes ou pretos.
