# Cashflow: referência visual para o OS

Rotas isoladas `/os-crm/clone/` e `/os-crm/clone/assinatura/?plano=gold`.
A página atual do OS não faz parte desta alteração.

A landing mantém o HTML, CSS, fontes, vídeos e componentes React do download
Save2Zip de 06/10/2026. Depoimentos, logos de integrações e `manifesto.jpg`,
carregados apenas no cliente e ausentes no download, foram copiados da referência.
Os links dos quatro planos apontam ao checkout local.

O componente de rastreamento foi substituído por uma implementação vazia,
e o pixel no `noscript` foi removido. Os indicadores públicos usam uma cópia
local dos números da referência de 06/10/2026; não são resultados do Imobiturbo.
A política CSP permite conexões somente com o próprio domínio. A demonstração
mantém o player original do YouTube sem cookies.

O checkout usa exclusivamente o DOM público, o CSS e as fontes da referência.
O bundle original de aplicação, Supabase, scripts de tracking, PWA e service
worker não são distribuídos. A seleção dos quatro planos, a exibição de senhas,
as máscaras e os campos funcionam localmente. Login, cupom e ativação exibem
um aviso de prévia: não criam conta, enviam dados ou realizam cobrança.

Para adaptar a identidade: landing em `index.html`, estilos em
`_next/static/chunks/2g37o96ou15w7.css`, componentes nos chunks originais,
checkout em `assinatura/index.html`, `assinatura/*-template.html` e
`assinatura/checkout.js`. Mantenha os HTMLs de pagamento sincronizados.

Validação: `node --test tests/os-crm-clone.test.cjs` e gates normais do site,
na VPS3. As páginas recebem `noindex` e são excluídas do middleware do site.
