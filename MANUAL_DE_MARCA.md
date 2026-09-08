# Manual de Identidade Visual e Diretrizes de Marca — Imobiturbo (2026)

> **Documento Oficial de Governança Estética**  
> Este manual estabelece a matriz definitiva de cores, tipografia, aplicações de logos e regras de contraste do ecossistema Imobiturbo. Deve ser seguido estritamente por desenvolvedores, designers e agentes de IA (Antigravity, Claude Code, Open Design).

---

## 1. A Matriz Oficial de Cores

A identidade da Imobiturbo é ancorada em uma paleta de alta precisão. O erro mais comum é confundir as funções dos dois tons de verde. Cada um tem um papel específico e **não são intercambiáveis**.

| Nome da Cor | Hex | Função Primária | Onde Usar | Onde NUNCA Usar |
| :--- | :---: | :--- | :--- | :--- |
| **Verde Intermediário da Marca** | **`#6CA438`** | **Acento em Fundo Claro** | Textos em destaque, palavras-chave em títulos no branco, bordas ativas de cards claros, ícones e detalhes sobre `#FFFFFF` ou `#FAF9F6`. | Nunca usar como fundo de botão de CTA principal ou sobre fundo preto sem teste de contraste. |
| **Limão Fluor (Ação Turbo)** | **`#C5FF5E`** | **Conversão & Alto Impacto** | Botões primários de CTA, tags de status ("Novo", "Ao Vivo"), badges pulsantes, detalhes de alta energia. | Nunca usar com texto branco. **Sempre com texto `#000000` em negrito.** |
| **Verde-Escuro Nobre** | **`#2F400D`** | **Fundo de Autoridade** | Cor de **FUNDO** (background) de seções de destaque, cards de plano anual, containers de VSL, banners nobres. | **NUNCA usar como texto ou acento sobre fundo branco** (parece preto desbotado ou mancha suja). |
| **Off-White Nobre** | **`#FAF9F6`** | **Canvas Light Mode** | Fundo geral de páginas e landing pages. Elimina o cansaço visual do branco puro (#FFF) em telas grandes. | Não usar em elementos que exigem contraste com a própria página (use `#FFFFFF` para cards). |
| **Branco Puro** | **`#FFFFFF`** | **Superfície & Cards** | Cards elevados, modais, formulários no Light Mode; texto nobre sobre `#2F400D` ou `#000000`. | - |
| **Preto Absoluto** | **`#000000`** | **Texto & Dark Mode** | Títulos (H1, H2, H3), textos corridos no Light Mode; canvas geral no Dark Mode. | Nunca usar cinza claro como substituto em títulos principais no modo claro. |

---

## 2. Regra de Ouro: Aplicação de Cores por Fundo (Matrix)

### Cenário A: Fundo Branco ou Off-White (`#FAF9F6` / `#FFFFFF`) — Modo Claro
* **Títulos e Textos Principais:** `#000000` (Preto puro) para máximo contraste e legibilidade.
* **Textos de Destaque / Grifos:** **`#6CA438`** (Verde Intermediário da Marca). Traz frescor, vida e autoridade sem escurecer a tela.
* **Botão de Ação Primário (CTA):** Fundo **`#C5FF5E`** com texto **`#000000`** OU Fundo **`#2F400D`** com texto **`#FFFFFF`**.
* **Fundo de Seção:** Limpo, liso, **sem malhas quadriculadas cinzas** ou gradientes radiais embaçados.

### Cenário B: Fundo Escuro (`#000000` / `#121212`) — Modo Noturno / Cockpit
* **Títulos Principais:** `#FFFFFF`.
* **Acentos e Destaques:** `#C5FF5E` (Limão Fluor) ou `#6CA438`.
* **Superfícies de Cards:** `#18181B` ou `#121212` com bordas sutis em `rgba(255,255,255,0.08)`.

### Cenário C: Bloco de Destaque em Verde-Escuro Nobre (`#2F400D`)
* **Uso:** Card do Plano Anual, banner de mentoria, rodapé executivo.
* **Títulos:** `#FFFFFF`.
* **Acentos e Badges:** `#C5FF5E` (Limão Fluor).
* **Botão CTA dentro deste bloco:** Fundo `#C5FF5E` com texto `#000000`.

---

## 3. Matriz Oficial de Logos e Ícones (Assets WebP)

Todos os arquivos canônicos residem em [`/assets/`](file:///mnt/d/Projetos/imobiturbo-design-system/assets/):

| Contexto / Fundo | Arquivo Canônico da Logo | Arquivo do Símbolo / Ícone |
| :--- | :--- | :--- |
| **Fundo Branco / Off-White** | `logo-black-green-on-white.webp` | `icon-black-green-on-white.webp` ou `icon-black-green-transparent.webp` |
| **Fundo Preto / Escuro** | `logo-white-lime-on-black.webp` | `icon-white-lime-on-black.webp` ou `icon-white-lime-transparent.webp` |
| **Fundo Verde-Escuro (#2F400D)** | `logo-white-lime-on-darkgreen.webp` | `symbol-white-lime-transparent.webp` |
| **Fundo Limão (#C5FF5E)** | `logo-black-darkgreen-on-lime.webp` | `symbol-imobiturbo-on-lime.webp` |

### Subprodutos Oficiais (Modo Claro vs Modo Escuro)
Localizados em [`/assets/subproducts/`](file:///mnt/d/Projetos/imobiturbo-design-system/assets/subproducts/):
* **Imobiturbo OS:** `subproduct-os-for-white-bg.webp` (Claro) | `subproduct-os-for-black-bg.webp` (Escuro)
* **Imobiturbo Club:** `subproduct-club-for-white-bg.webp` (Claro) | `subproduct-club-for-black-bg.webp` (Escuro)
* **Imobiturbo Radar:** `subproduct-radar-for-white-bg.webp` (Claro) | `subproduct-radar-for-black-bg.webp` (Escuro)
* **Imobiturbo Ads:** `subproduct-ads-for-white-bg.webp` (Claro) | `subproduct-ads-for-black-bg.webp` (Escuro)
* **Imobiturbo Sites:** `subproduct-sites-for-white-bg.webp` (Claro) | `subproduct-sites-for-black-bg.webp` (Escuro)
* **Imobiturbo Clone:** `subproduct-clone-for-white-bg.webp` (Claro) | `subproduct-clone-for-black-bg.webp` (Escuro)
* **Imobiturbo News:** `subproduct-news-for-white-bg.webp` (Claro) | `subproduct-news-for-black-bg.webp` (Escuro)

---

## 5. Regra Mandatória de Dimensionamento de Logos (Padrão 2x Proporcional)

> **RESOLUÇÃO NATIVA DOS ARQUIVOS E REGRA DOS 2X:**  
> Todos os arquivos de logo e ícones oficiais são master WebP de altíssima definição:
> - **Logos Master (Brand Mãe):** `7.853 x 1.139 px` (~8K widescreen)
> - **Ícones / Símbolos Quadrados:** `4.687 x 4.687 px` (~4.7K)
> - **Logos de Subprodutos:** `~3.000 x 729 px` (~3K widescreen)
>
> **NÃO HÁ RISCO DE PIXELIZAÇÃO OU PERDA DE QUALIDADE.** O erro em implementações anteriores foi limitar o CSS a alturas tímidas (`height: 26px` ou `32px`), gerando marcas minúsculas e sem autoridade.  
> **A REGRA OFICIAL É O PADRÃO 2X PROPORCIONAL:**

| Contexto de Aplicação | Altura Mínima (Desktop) | Largura Proporcional | Altura Mínima (Mobile) | Regra de CSS Obrigatória |
| :--- | :---: | :---: | :---: | :--- |
| **Header / Navbar Principal (Logo Master)** | **56px a 64px** | ~380px a 440px | **40px a 44px** | `height: 56px; width: auto; max-width: 100%;` (Nunca `< 48px` no desktop) |
| **Faixa de Ecossistema (Subprodutos)** | **52px** | ~215px a 230px | **40px** | `height: 52px; width: auto; object-fit: contain;` (O dobro dos 26px legados) |
| **Grid / Cards de Ferramentas / Vitrines** | **64px a 72px** | ~260px a 300px | **48px a 52px** | `height: 64px; width: auto; max-width: 280px;` |
| **Ícone / Launcher de Apps (Quadrado)** | **64x64px a 80x80px** | Proporção 1:1 | **48x48px** | `width: 64px; height: 64px; border-radius: 14px;` |
| **Rodapé Institucional** | **48px a 56px** | ~320px a 380px | **36px a 40px** | `height: 48px; width: auto;` |

---

## 6. Tipografia Oficial

* **Família Primária & Títulos:** `Plus Jakarta Sans`
  * Pesos aceitos: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold).
  * Sentença normal (*Sentence case*) — Proibido forçar todo o texto em caixa alta (*ALL CAPS*) fora de pequenos selos/badges.
* **Família de Dados & Código:** `JetBrains Mono`
  * Uso: Valores monetários (R$), métricas de VGV, contadores, tags técnicas e código.
* **Proibição Absoluta:** Jamais utilizar fontes antigas do projeto como Futura ou Inter.

---

## 7. Diretrizes de Ergonomia para o Público 40+ (Corretores e Empresários)

1. **Tamanho Mínimo de Leitura:** Textos de parágrafo nunca devem ter menos de 16px em telas mobile e desktop.
2. **Espaçamento de Linha:** Mínimo de `line-height: 1.55` para evitar que as linhas de texto fiquem coladas.
3. **Área de Toque em Botões:** Altura mínima de 48px para facilitar o clique preciso no celular sem esforço.
4. **Sem Texturas Sujas:** Proibido o uso de grids embaçados (`linear-gradient` quadriculado) ou vinhetas escuras atrás de títulos em fundo claro. O fundo claro deve ser límpido, respirável e nobre.
