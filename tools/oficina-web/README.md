# Oficina Imobiturbo — interface

Landing `/oficina/` e retorno `/oficina/obrigado/`, construídos exclusivamente com componentes oficiais shadcn/ui Radix Nova, neutral claro e Geist local. Componentes foram gerados pelo CLI `shadcn@4.21.1`; os componentes comuns e o tema oficial são os mesmos da consulta do plano, sem importar CSS visual do website.

Conteúdo baseado no pacote comercial `infra-launch-marketing-20261002/docs/launches/imobiturbo-oficina-202610/`, com as atualizações explícitas: 9 e 10/10/2026, programação 19h30–21h30 Brasília, ingresso R$47, Natan Pimentel como apresentador, reembolso em até sete dias pelo suporte. Replay previsto por 14 dias. Reembolso usa o texto comercial exato autorizado: solicitação com identificação da compra, pela forma de pagamento utilizada; prazo bancário informado no atendimento. Nenhuma sala privada, case de cliente inventado ou promessa financeira foi incluída.

## Build na VPS3

Somente como `natan`, em `/opt/builds/website-oficina-landing-20261002`:

```sh
npm ci
npm --prefix tools/oficina-web ci
npm run build:pages
npm --prefix tools/oficina-web test
```

A integração pontual em `build-pages.js` preserva as entradas existentes, executa o build isolado e copia `tools/oficina-web/dist` para `.cloudflare-pages/oficina`. Os HTML fonte ficam em `oficina/index.html` e `oficina-obrigado/index.html`; `scripts/prepare.mjs` prepara as entradas internas do Vite. Assets usam `/oficina/assets/`. A pasta fonte `oficina-obrigado` não é a URL pública: o retorno publicado é `/oficina/obrigado/`.

No release worktree baseado no `origin/main` atual, manter todos os novos blocos de build das demais interfaces ao integrar a alteração pontual. Nada de `/vagas/` foi alterado neste commit.

## Contrato da API do root

- `GET /api/oficina/config`: `{checkoutUrl,price:47,datesConfirmed:true}`. Checkout nulo, configuração indisponível, preço divergente ou datas não confirmadas deixam as inscrições em preparação, com tentativa novamente e suporte. O formulário mantém seus dados enquanto a configuração é atualizada.
- `POST /api/oficina/lead`: `{name,email,phone,profile,consent:true,tracking}`. Perfis: `corretor`, `gestor`, `cliente_atual`. Telefone enviado com apenas dígitos. Sem CPF/cartão.
- Resposta `{ok:true,checkoutUrl}` confirma o registro; somente uma URL HTTPS do domínio Asaas libera encaminhamento. Falhas nunca encaminham silenciosamente.
- Tracking preserva UTMs, source/campaign/adset/ad, identificadores Meta `imt_*` e click IDs permitidos. Parâmetros pessoais e arbitrários não são copiados. CTAs por hash conservam a query.

## Hub e pixel

Reutiliza `https://track.nmidigital.tech/t.js` e a operação existente `00000000-0000-0000-0000-000000000001`, sem reutilizar o offer ID da assinatura. Identificador do produto da oficina: `oficina-imobiturbo-202610`.

`ViewContent` só na landing; `Lead` só depois de `ok:true` da API (mesmo se a URL faltar); `InitiateCheckout` só depois de URL validada. O helper usa os pixels configurados no Hub para a origem/rota e a mesma ocorrência `eventID`; quando o fbq já está envolvido pelo Hub, deixa o próprio wrapper enviar ao coletor, evitando um segundo envio direto. Falha do tracker não bloqueia a inscrição.

A página de obrigado não carrega o tracker da LP, não emite conversão e não trata URL/query como prova de pagamento. Não há `Purchase` no frontend: esse evento pertence exclusivamente ao webhook pago do processador. Não há ativação de Comunidade.

## Evidência

- Build de Pages e typecheck passaram na VPS3 como `natan`.
- 11 testes passaram: contrato/validação, erros, atribuição, confirmação de Lead, Hub e pixel.
- Chrome compartilhado em abas novas, preservadas: 1440×1000 e 390×844 sem overflow, fonte Geist confirmada.
- API simulada de preview: 503 preservou campos e permitiu retry; sucesso encaminhou a um checkout fixture interceptado, sem pagamento real.
- Eventos simulados na ordem `ViewContent`, `Lead`, `InitiateCheckout`; nenhuma conversão no obrigado, mesmo com `?status=paid`.
- Config indisponível bloqueou pagamento; retry com config pronta restaurou o CTA.
- `/politica-de-privacidade/` e `/termos-de-servico/` públicos responderam HTTP 200 em 02/10/2026; suporte publicado nesses documentos: `suporte@imobiturbo.com.br`. Termos próprios da oficina ficam em `/oficina/#condicoes`.
- Evidências locais: `/tmp/oficina-landing-evidence/` (screenshots e `browser.txt`).

`tests/preview-fixture.cjs` serve apenas em loopback na VPS3, com API simulada, sem retenção dos dados de teste; não é copiado para o artefato publicado.

## Limites da entrega

Sem deploy/push/merge. Root integra API/config no release worktree atual e comprova registro real no CRM, checkout do ingresso, recebimento dos eventos no Hub/pixel e confirmação pelo webhook. Build validado e eventos simulados não comprovam esses passos em produção. O npm ci da raiz sinalizou três vulnerabilidades herdadas; dependências raiz não foram alteradas. Vite informa que `site-tracking.js` é um script clássico externo ao bundle; o build conserva sua URL e o script é copiado pelo pipeline existente.
