# Checkout: AbacatePay Pix e Hotmart no cartão

Status: integração Hotmart em implementação na branch; não publicada. As seções sobre Stripe abaixo são o histórico da investigação, substituído pela decisão Hotmart.

## Regra comercial confirmada

Natan confirmou o item 1: maior compromisso com o período completo dá maior desconto. No cartão, anual = R$ 1.164 em 12x de R$ 97; trimestral = R$ 381 em 3x de R$ 127; mensal = R$ 147. Não substituir o anual/trimestral por mensalidade recorrente cancelável. A definição comercial não é mais uma pendência.

O pedido de meios de pagamento permanece Pix pelo AbacatePay e cartão pelo Stripe Elements. Natan esclareceu que espera 3x R$ 127 com renovação a cada três meses. O teste anterior usou uma compra avulsa e não avaliou essa renovação. A conclusão de que esse teste inviabilizava o modelo de assinatura foi excessiva e está retirada. Não há autorização nem justificativa suficiente para trocar o gateway com base apenas nele.

É necessário distinguir o mecanismo financeiro: três cobranças mensais de R$ 127 com compromisso trimestral podem usar Stripe Billing; uma venda de R$ 381 parcelada pelo banco, repetida a cada trimestre, continua dependendo do suporte a parcelamento bancário. A frequência da renovação do compromisso não altera essa diferença. Não transformar silenciosamente uma modalidade na outra nem prometer recebimento antecipado usando cobranças mensais.

A documentação do AbacatePay restringe assinaturas automáticas a CARD. Pix transparente paga um período de acesso; renovar exige nova cobrança. Referência: https://docs.abacatepay.com/pages/subscriptions/create

## Preparado

- Pix exclusivamente no AbacatePay; erros e timeouts não criam cobrança alternativa no Asaas.
- Plano desconhecido é rejeitado antes da cobrança.
- Tracking não pode sobrescrever plano, comprador ou identificador do pagamento.
- Cliente REST Stripe com versão fixa, idempotência obrigatória em escritas, recusa de dados brutos de cartão e erros sem detalhes privados do provedor.
- Verificador de assinatura Stripe para o corpo original, com tolerância de 5 minutos e suporte à rotação de secrets.

O helper Stripe ainda não está conectado à rota de checkout. O formulário continua usando o cartão legado até a validação do fluxo de assinatura e renovação pedido; nenhuma mudança desta branch chegou à produção.

## Evidência

Na VPS3, os testes de Pix reproduziram cinco falhas anteriores: fallback indevido, fallback após timeout, falta de credencial, metadados sobrescritos e plano inválido. Após a alteração, 16 testes direcionados passaram (Pix, fronteira Stripe e contratos existentes do checkout).

Build `npm run build:pages` aprovado na VPS3 em `cfd1bb7`, com checkout limpo e lock canônico preservado. As duas tentativas anteriores terminaram com código 75 aguardando o lock; a nova execução concluiu os bundles e a compilação do Worker. Não há certificação de E2E da integração completa.

Leitura autenticada do catálogo Stripe em teste: HTTP 200. As duas configurações de produção encontradas no CLI retornaram HTTP 401. A chave publicável foi localizada no painel autenticado. Nenhuma cobrança ou assinatura real foi criada.

AbacatePay: leitura autenticada de loja e webhooks com HTTP 200. Há webhooks para Hub Cashflow, Mimiu e OS; não foi encontrado webhook da landing page. A liberação de acesso deverá ser rastreada pelo fluxo do OS antes de ativar a integração, evitando dois emissores de boas-vindas ou acessos duplicados.

## Alcance do teste de parcelamento Stripe

Teste executado na VPS3, somente no sandbox da conta `acct_1QHx1pKoMeVMYJBu`, cujo país retornado pela API é `BR`. Versão da API: `2025-06-30.basil`.

- Criado PaymentIntent de teste `pi_3UIYnqKoMeVMYJBu1Cwx62f0`, BRL 116400, cartão, `installments.enabled=true`; `livemode=false`.
- Associado o PaymentMethod oficial de teste `pm_card_br`. Retorno `requires_confirmation`, `available_plans=[]`.
- Tentativas de confirmar `fixed_count`, `interval=month`, `count=12` e `count=3`: ambas HTTP 400, `payment_intent_invalid_parameter`, plano de parcelamento não suportado pelo método de pagamento.
- Nenhuma cobrança real. Esse resultado comprova a falha nesse cenário do sandbox; não certifica capacidades de produção com outras bandeiras/configurações nem testa assinatura com renovação trimestral.

Reteste específico solicitado: **R$ 381 em 3x R$ 127**, na mesma conta BR e com o PaymentMethod oficial de teste `pm_card_br`. PaymentIntent `pi_3UIZFCKoMeVMYJBu0pREddN4`, `amount=38100`, `currency=brl`, `livemode=false`. A criação retornou HTTP 200, mas `available_plans=[]`; a confirmação de `fixed_count/month/3` retornou HTTP 400, `payment_intent_invalid_parameter`, plano não suportado pelo método de pagamento. Consulta posterior: `requires_confirmation`, `amount_received=0`, `latest_charge=null`. Portanto, a compra única nesse valor com parcelamento bancário não funcionou nesse teste. Renovação trimestral não foi testada; não houve cobrança real nem teste de produção.

A documentação pública do Stripe descreve parcelamento por região, incluindo México/MXN e Japão; não fornece um fluxo equivalente de parcelamento brasileiro para este cenário:

- https://docs.stripe.com/payments/installments
- https://docs.stripe.com/payments/mx-installments
- https://docs.stripe.com/testing

Foi apresentada uma alternativa de checkout hospedado do AbacatePay. A recomendação de troca está retirada: o teste realizado não respondeu à dúvida sobre renovação trimestral. A direção continua sendo Stripe Elements para cartão. Nenhum checkout alternativo foi implementado ou publicado.

Suporte documentado do AbacatePay: https://docs.abacatepay.com/pages/payment/installments

## Diagnóstico: sandbox, conta ou disponibilidade regional

Verificação adicional em 22/09/2026, sem cobranças reais e sem alterar configurações do painel:

- API de teste da conta: `country=BR`, `charges_enabled=true`, `payouts_enabled=true`, `capabilities.card_payments=active`, sem `requirements.disabled_reason` ou erros de requisitos. Isso não prova habilitação de parcelamento.
- Oito criações de PaymentIntent, cruzando `pm_card_br`/`pm_card_mx`, BRL 38100/MXN 100000 e versões `2025-06-30.basil`/`2026-08-26.dahlia`: todas HTTP 200, `livemode=false`, `requires_confirmation`, `available_plans=[]`. Nenhuma foi confirmada. O resultado não mudou com a versão da API; como nenhum controle retornou planos, a matriz não exclui sozinha um problema de sandbox/configuração.
- Referências BRL/cartão BR: `pi_3UIZOWKoMeVMYJBu0ZdxbxN3`, request `req_NYefiEoJ8iyfsX` (basil); `pi_3UIZOYKoMeVMYJBu10lzr13G`, request `req_D1BGZz8bQfTQv0` (dahlia).
- Painel autenticado de produção, configuração Default `pmc_1RArtGKoMeVMYJBuN7Ed1sma`: Cartões habilitado, zero formas de pagamento com ação necessária; detalhes de Cartões indicam pagamentos recorrentes suportados. Não apareceu opção de parcelamento na lista ou nos detalhes de Cartões inspecionados. Ausência de opção não certifica inexistência de habilitação especial.
- A documentação do recurso testado exige conta Stripe México, cartão emitido no México e moeda MXN: https://docs.stripe.com/payments/mx-installments#requirements . O índice público de parcelamento também documenta outros produtos regionais, sem fluxo equivalente em BRL: https://docs.stripe.com/payments/installments .

**Inferência:** indisponibilidade regional do parcelamento bancário é mais provável que bloqueio cadastral da conta ou erro causado pela versão da API. Ainda não há prova conclusiva de bug de sandbox nem confirmação da Stripe sobre habilitação especial para esta conta brasileira. Assinatura recorrente e parcelamento bancário continuam sendo capacidades distintas.

Pergunta preparada para o suporte, **não enviada**: “A conta brasileira `acct_1QHx1pKoMeVMYJBu` pode processar uma única compra de R$ 381 em 3 parcelas bancárias de R$ 127, em BRL, usando PaymentIntent e Stripe Elements, e repetir essa compra na renovação trimestral? No teste `pi_3UIZFCKoMeVMYJBu0pREddN4`, não há planos disponíveis e `fixed_count/month/3` retorna `payment_intent_invalid_parameter`. É indisponibilidade do produto no Brasil, alguma habilitação pendente nesta conta ou divergência do ambiente de testes? Há suporte para renovação automática nesse formato?”

## Trabalho restante

1. Validar o mecanismo financeiro da assinatura com renovação trimestral/anual, preservando o compromisso contratado e a forma de recebimento esperada.
2. Implementar Stripe Elements, confirmação/3DS, retorno e estado pendente conforme essa validação.
3. Verificar e integrar os eventos pagos/renovados ao provisionamento canônico do OS, com autenticação e idempotência.
4. Configurar credencial Stripe de produção válida e endpoint de webhook; testar primeiro no sandbox.
5. Validar jornadas de Pix/cartão na VPS3, revisar, integrar, publicar e conferir produção.

Foi encontrado material de credenciais versionado no helper legado `_notifications.js`; requer migração para secrets e rotação, sem copiar valores em relatórios ou logs.

## Navegador

Chrome CDP compartilhado preservado. Nenhuma aba foi fechada. A aba de inspeção das chaves Stripe permanece aberta; Natan fecha as abas quando desejar.

## Direção aprovada: Hotmart (22/09/2026)

Natan autorizou usar a Hotmart e disponibilizou o painel autenticado e o MCP. Produto já existente e ativo: **Comunidade Imobiturbo, ID 8559421**, assinatura. Mimiu 8547534 não foi alterado.

Configuração verificada no painel:

| Plano | Oferta | Período e cobrança |
| --- | --- | --- |
| Anual existente | `vgygksgc` | R$ 1.164 por ano, até 12x de R$ 97 sem juros para comprador |
| Trimestral 3x criado nesta missão | `k3sq4mg8` | R$ 381 a cada três meses, até 3x de R$ 127 sem juros para comprador |
| Mensal existente | `4zruzp5h` | R$ 147 mensal |
| Trimestral legado preservado | `ua8aap3x` | R$ 381 trimestral à vista; não usado na landing |

O produtor absorve as taxas de parcelamento. O recuperador anual que convertia compras recusadas por falta de limite em mensalidades canceláveis foi desativado para preservar o compromisso solicitado. Metadados das ofertas: `product_id=imobiturbo-club`, `offer_code` e `plan` com a periodicidade. Nenhuma compra real foi feita.

Código oficial do widget obtido no painel: `https://static.hotmart.com/checkout/widget.min.js`. O código atual abre iframe/Fancybox em desktop e navega ao checkout em mobile. O link direto permanece como fallback caso o widget não esteja disponível. Os parâmetros `split`, `hidePix`, `hideBillet`, dados pré-preenchidos e demais meios seguem a documentação oficial: https://suportehotmart.zendesk.com/hc/pt-br/articles/115003588572

### Liberação de acesso: achados que precisam ser resolvidos antes da publicação

O Hub em produção encaminha Hotmart `imobiturbo-club`/`8559421` para `https://www.imobiturbo.com.br/api/checkout/webhook`. O Hottok é encaminhado, mas o site legado não o validava; a validação está sendo adicionada. Eventos Hotmart não devem gerar um segundo Purchase, pois o Hub já é responsável por isso.

O RPC `public.provision_community_membership` existe na VPS4. Leitura da definição confirmou: renova a partir de `now()` sem idempotência por transação, usa 30/90/365 dias e o cancelamento por e-mail revoga todos os acessos club/os/radar, independentemente da transação. Não é adequado afirmar que a renovação/reembolso está validada. Será necessário proteger duplicatas e revogações antes da ativação completa. O endpoint legado também reconhece eventos de outros gateways sem autenticação; é dívida preexistente pertinente ao pagamento.

Testes novos executados na VPS3 reproduziram a ausência das novas fronteiras Hotmart. Validação após implementação ainda pendente. Nenhuma mudança de banco realizada.
