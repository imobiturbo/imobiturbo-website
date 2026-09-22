# Checkout da Comunidade: Hotmart e AbacatePay

Status: cartão Hotmart publicado em produção em 22/09/2026; migrations aplicadas e webhook direto ativo. Pix Automático exigido pelo usuário após a publicação está pendente da habilitação da loja AbacatePay. O Pix atualmente publicado ainda é avulso. Não houve compra financeira real.

## Correção de requisito: Pix com renovação automática

O usuário determinou que o Pix AbacatePay também deve renovar automaticamente conforme o período contratado: R$ 997/ano, R$ 357/trimestre ou R$ 147/mês. A decisão anterior de manter Pix avulso foi superada; a tabela abaixo registra o comportamento publicado, não o aceite final do Pix.

Verificação em 22/09/2026:

- O [changelog oficial de 15/05/2026](https://docs.abacatepay.com/pages/changelog) confirma `QUARTERLY` e Pix Automático para assinaturas, condicionado à habilitação na loja. Partes da referência de criação ainda dizem somente `CARD`; não usar esse trecho antigo para concluir ausência global da funcionalidade.
- A credencial existente leu o catálogo de produção com HTTP 200. Há produtos recorrentes mensais e trimestrais nos valores corretos; o anual existente tem R$ 957 e precisa de uma oferta nova de R$ 997 para preservar contratos anteriores.
- Uma tentativa de criar checkout de assinatura mensal, `methods: ["PIX"]`, sem cliente ou dados de pagamento, retornou HTTP 400: `PIX Automático is not available for this store`. Nenhuma cobrança foi paga e nenhuma assinatura foi ativada.
- O painel foi aberto em uma nova aba CDP, mas está em `/login`. Foi solicitado ao usuário entrar para verificar a habilitação. Chrome e todas as abas permanecem abertos.
- A API documentada exige checkout de assinatura e autorização do pagador; o endpoint transparente avulso atualmente usado não estabelece a recorrência. A integração e os textos só podem ser publicados como Pix Automático após validar essa jornada na loja habilitada.
- Na retomada: validar habilitação; configurar produto anual correto; trocar o fluxo de Pix para assinatura; tratar `subscription.completed` e `subscription.renewed` com autenticação e idempotência; testar os períodos, recusa da autorização e duplicatas na VPS3 antes da publicação.

Não houve alteração do código de produto, banco ou configuração de cobrança nesta verificação.

## Regra comercial implementada

| Plano | Cartão Hotmart | Pix AbacatePay |
| --- | --- | --- |
| Anual | R$ 1.164 por ano, até 12x R$ 97; renovação anual | R$ 997 pelo ano |
| Trimestral | R$ 381 por trimestre, até 3x R$ 127; renovação trimestral | R$ 357 pelo trimestre |
| Mensal | R$ 147; renovação mensal | R$ 147 pelo mês |

As parcelas são do valor total do período. O recuperador que convertia recusa por limite em mensalidade cancelável foi desativado. O produtor absorve as taxas de parcelamento. Pix não renova automaticamente.

Produto Hotmart existente: Comunidade Imobiturbo `8559421`, checkout `https://pay.hotmart.com/J107689854N`. Ofertas verificadas no painel e no checkout público:

- Anual: `vgygksgc`, 12x R$ 97 / ano.
- Trimestral criado: `k3sq4mg8`, 3x R$ 127 / trimestre.
- Mensal: `4zruzp5h`, R$ 147 / mês.
- Trimestral legado `ua8aap3x` preservado, sem uso na landing.

Mimiu `8547534` não foi alterado. Pix e Pix automático foram desativados neste produto Hotmart; esse meio permanece no AbacatePay.

## Jornada

A landing mantém o formulário de identificação. Cartão abre o widget oficial da Hotmart em desktop; em mobile o widget oficial navega para o checkout hospedado. Se o widget não carregar, o link hospedado também é o fallback. Nenhum PAN/CVV é coletado pelo site. Ofertas, parcelas, dados pré-preenchidos e UTMs são preservados.

Pix continua transparente pelo AbacatePay. Falha, timeout, falta de credencial ou plano desconhecido não geram uma cobrança alternativa no Asaas. O checkout legado de outras páginas fica fora desta mudança.

Documentação oficial:
- Widget: https://suportehotmart.zendesk.com/hc/pt-br/articles/360004829631
- Parâmetros: https://suportehotmart.zendesk.com/hc/pt-br/articles/115003588572
- Planos: https://suportehotmart.zendesk.com/hc/pt-br/articles/360060619412

## Aprovação e acesso

O site autentica o Hottok, restringe produto/ofertas e só concede acesso em `PURCHASE_APPROVED`. `PURCHASE_COMPLETE` não é renovação. O Hub permanece responsável pelo registro financeiro e pelo Purchase/Meta CAPI; o site não emite um segundo Purchase para Hotmart.

A nova RPC `provision_community_purchase` reutiliza `webhook_events_log` e a rotina existente de usuário/contato/lead. Travas por transação e comprador protegem entregas simultâneas. O vencimento deriva da data de aprovação, em meses de calendário; acessos anteriores mais longos ou permanentes são preservados. Falha na concessão retorna HTTP 503 para permitir retry; duplicata não reenvia boas-vindas.

A RPC só pode ser executada pelo serviço e confere a organização do contato. Reembolso/chargeback permanecem sujeitos à revisão manual, conforme política do OS. Cancelar a assinatura não revoga o período pago.

Webhook direto salvo e ativo na Hotmart: `Comunidade Imobiturbo - Acesso idempotente`, versão 2.0.0, exclusivamente para Compra aprovada do produto 8559421, em `https://imobiturbo-website.pages.dev/api/checkout/webhook`. A configuração persistiu após recarregar o painel. Os webhooks anteriores foram preservados.

O domínio estável de produção do Pages evita o desafio de bots observado nas chamadas da VPS3 ao domínio comercial. O endpoint continua protegido pelo Hottok. Essa entrega direta permite que a Hotmart repita uma chamada se a concessão falhar, sem depender do encaminhamento atual do Hub, que não faz retry. Entregas duplicadas dos dois caminhos são idempotentes. O Hottok do painel foi comparado por hash com a credencial existente do Hub e correspondeu.

Secrets Hotmart e OS configurados no Cloudflare Pages sem imprimir valores. Acesso do serviço ao OS conferido com consulta sem linhas de clientes.

## Validação

- VPS3: 24 testes de servidor/contratos (Hotmart, Pix e legado) aprovados.
- VPS3: 3 jornadas de navegador, incluindo widget oficial real, widget controlado e fallback mobile; POSTs financeiros bloqueados.
- VPS3: PostgreSQL efêmero valida duplicatas, concorrência real entre sessões, períodos calendário, rollback e organização incorreta.
- VPS3: baseline em install/update e 5 invariantes aprovados, incluindo a concessão/duplicata sobre o contrato real de `webhook_events_log`. O update tolera erros antigos de objetos existentes por contrato do runner.
- Contrato da nova RPC regenerado via Supabase CLI e integrado sem substituir tipos não relacionados.
- Produção: prova SQL dentro de transação confirmou concessão trimestral, vencimento em três meses de calendário e duplicata sem nova concessão. `ROLLBACK` deixou zero usuários e recibos sintéticos. Execução da RPC negada a `anon` e permitida a `service_role`.
- Produção: token inválido retorna 401; token válido com produto fora da lista retorna 200/ignorado sem conceder acesso. A VPS2 confirmou esse caminho nos dois domínios; a VPS3 confirmou autenticação no domínio Pages.
- Produção via Chrome compartilhado/CDP: widget totalmente carregado dentro da página, com `3 x de R$ 127,00 / trimestre`, total R$ 381, renovação a cada três meses e identidade sintética pré-preenchida. O formulário nativo fecha antes do widget; campos PAN/CVV só aparecem no domínio Hotmart. Evidência visual local: `/tmp/imobiturbo-checkout-raw-cdp.png`. Nenhuma compra foi enviada. Chrome e todas as abas permanecem abertos.
- A tentativa adicional de navegador headless da VPS3 contra o domínio comercial foi bloqueada pelo desafio Cloudflare (403); seus três testes não passaram e não são contados como evidência funcional. Os três testes de navegador aprovados usaram o candidato servido na VPS3 e o checkout real da Hotmart.
- Compra financeira real, aprovação de cartão e renovação futura não foram executadas. A confirmação dos valores no checkout não certifica essas etapas.

O endpoint legado de outros gateways aceita eventos sem a autenticação introduzida para Hotmart. É dívida preexistente; estes testes não certificam a segurança de todos os gateways. A confirmação de acesso é idempotente; notificações de boas-vindas continuam best effort e não constituem uma fila de entrega.

## Publicação e rastreabilidade

- Site: [PR #5](https://github.com/imobiturbo/imobiturbo-website/pull/5), commit `3e5c432db7ff1b561724f1f7f1369eb8b6eb1ff8`.
- Build, Worker e publicação executados na VPS3 pelo entrypoint `deploy:pages`, com lock de CI. Deployment de produção `042349d1-9e7c-404a-8f7f-8ef9e77c5bd1`: https://042349d1.imobiturbo-website.pages.dev.
- Página publicada: https://www.imobiturbo.com.br/vagas-v2/. HTML e helper de checkout conferidos em produção.
- OS: [PR #254](https://github.com/imobiturbo/imobiturbo-os-operacao/pull/254) e [PR #255](https://github.com/imobiturbo/imobiturbo-os-operacao/pull/255), integrada até `927945741679b11168ebea9b408ee435b3baefca`.
- Migrations aplicadas pelo Supabase CLI: `20260922202443_0202_community_purchase_idempotency.sql` e `20260922204945_0203_community_purchase_journal_contract.sql`. A segunda é correção incremental do campo obrigatório `raw_body`, detectado pela prova SQL antes de publicar o checkout; a primeira migration permaneceu imutável.
- Sem release da aplicação OS: imagem `ghcr.io/imobiturbo/imobiturbo-deskcomm-app:sha-091906c33` preservada e saudável após a alteração de banco.

Evidências na VPS3: `/tmp/community-checkout-unit.log`, `/tmp/community-checkout-browser.log`, `/tmp/community-checkout-db-gate-final.log`, `/tmp/community-checkout-deploy.log`. A tentativa bloqueada pelo WAF está em `/tmp/community-checkout-live-browser.log`.

Evidências de banco na VPS4: `/opt/imobiturbo-os/releases/community-checkout-20260922/`, incluindo migrations, verificação e logs de aplicação. Segredos não estão no relatório nem no Git.

Rollback identificado, não executado: desativar apenas o novo webhook direto e restaurar o deployment Pages anterior `6a807b8b-82a3-4039-88c9-94ab75461302` (fonte `6784f78`). A RPC aditiva pode permanecer sem uso; nenhuma reversão destrutiva de acessos é necessária.

## Decisão de gateway

O Stripe foi descartado para esta implementação após o requisito essencial de parcelamento bancário brasileiro. Os testes anteriores do sandbox BR (3x R$ 127 e 12x R$ 97 com `pm_card_br`) retornaram `available_plans=[]` e `payment_intent_invalid_parameter`. Isso não prova, isoladamente, impossibilidade para toda conta/configuração de produção. A direção Hotmart foi autorizada depois desses testes; não houve cobrança real no Stripe.
