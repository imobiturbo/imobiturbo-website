# Checkout: AbacatePay e Stripe Elements

Status: implementação parcial em branch; não publicada.

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

## Trabalho restante

1. Validar o mecanismo financeiro da assinatura com renovação trimestral/anual, preservando o compromisso contratado e a forma de recebimento esperada.
2. Implementar Stripe Elements, confirmação/3DS, retorno e estado pendente conforme essa validação.
3. Verificar e integrar os eventos pagos/renovados ao provisionamento canônico do OS, com autenticação e idempotência.
4. Configurar credencial Stripe de produção válida e endpoint de webhook; testar primeiro no sandbox.
5. Validar jornadas de Pix/cartão na VPS3, revisar, integrar, publicar e conferir produção.

Foi encontrado material de credenciais versionado no helper legado `_notifications.js`; requer migração para secrets e rotação, sem copiar valores em relatórios ou logs.

## Navegador

Chrome CDP compartilhado preservado. Nenhuma aba foi fechada. A aba de inspeção das chaves Stripe permanece aberta; Natan fecha as abas quando desejar.
