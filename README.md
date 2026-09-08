# Imobiturbo Website (`imobiturbo.com.br`)

Site institucional, hub de autoridade e páginas de conversão do ecossistema **Imobiturbo por Natan Pimentel**.

---

## 🎯 Objetivo & Posicionamento

O site funciona como o canal principal de atração, prova social e direcionamento de tráfego qualificado para corretores de imóveis, imobiliárias e construtoras/incorporadoras.

* **Identidade Visual:** Minimalista, premium e de alto contraste (Dark Canvas com acentos em *Pantone Lime Punch* `#BFD730`).
* **Performance:** HTML5 estático semântico, CSS puro e zero runtime frameworks, garantindo carregamento instantâneo e SEO técnico de alto nível.
* **Hospedagem & Edge:** Distribuído globalmente via **Cloudflare Pages** e **Cloudflare Workers**.

---

## 🏛️ Estrutura de Páginas e Rotas

```text
imobiturbo-website/
├── index.html                   # Página principal institucional (imobiturbo.com.br)
├── corretor-autonomo/           # Solução e proposta para corretores autônomos
├── imobiliarias/                # Solução e funil para imobiliárias
├── construtoras-incorporadoras/ # Solução para construtoras e incorporadoras
├── depoimentos/                 # Central de prova social (prints e vídeos de clientes)
├── lp-simulador/                # Simulador de ROI e processos de CRM ImobiTurbo
├── lp-pages/                    # Landing pages temáticas e campanhas específicas
├── guia/                        # Guias e materiais educativos
├── prompts-para-anuncios/       # Biblioteca de prompts para geração de anúncios
├── downloads/                   # E-books, PDFs e assets para download
├── xpertinformatica/            # Projeto/solução para Xpert Informática
├── functions/                   # Cloudflare Pages Functions (Edge backend)
└── assets/                      # Imagens, vídeos, fontes e criativos
```

---

## 🛠️ Desenvolvimento Local

Requisitos: **Node.js 20+**.

```bash
# Instalar dependências
npm install

# Iniciar servidor local de desenvolvimento
npm run dev

# Rodar testes automatizados
npm test

# Executar build de produção
npm run build
```

---

## 🚀 Deploy & Publicação

O site e suas landing pages associadas são publicados via **Cloudflare Pages** e **Wrangler**:

```bash
# Build e deploy do site principal
npm run deploy:pages

# Deploy do simulador (Cloudflare Pages + Worker)
npm run deploy:lp-simulador
npm run deploy:lp-simulador-route

# Deploy das landing pages adicionais
npm run deploy:lp-pages
npm run deploy:lp-pages-route

# Deploy do projeto Xpert Informática
npm run deploy:xpertinformatica
npm run deploy:xpertinformatica-route
```

---

## 🎨 Diretrizes de Design & Marca (Rebranding 2026 Oficial)

* **Paleta Oficial:** Preto puro (`#000000`), Acento Limão (`#C5FF5E`), Verde Intermediário da Marca (`#6CA438`) no fundo claro, Verde-Escuro Nobre (`#2F400D`) em containers de autoridade e Off-White (`#FAF9F6`).
* **Tipografia Única:** `Plus Jakarta Sans` para toda a hierarquia (Display, Títulos, Subtítulos, UI e Corpo), com dados financeiros e métricas em `JetBrains Mono`.
* **Manual Canônico:** Consulte [`MANUAL_DE_MARCA.md`](MANUAL_DE_MARCA.md) e [`DESIGN.md`](DESIGN.md). Proibido expressamente o uso de Futura, Barlow Condensed ou Inter.
