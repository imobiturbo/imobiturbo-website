# Checkout da Comunidade: Hotmart e AbacatePay

Status: integração validada na VPS3; publicação e confirmação em produção em andamento.

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

Foi preparado webhook direto exclusivo para este produto/aprovação, além do Hub. Isso permite que a Hotmart repita uma entrega se a concessão falhar, sem depender do encaminhamento atual do Hub, que não faz retry. Ativação após publicação do endpoint.

Secrets Hotmart e OS configurados no Cloudflare Pages sem imprimir valores. Acesso do serviço ao OS conferido com consulta sem linhas de clientes.

## Validação

- VPS3: 18 testes de servidor/contratos (Hotmart, Pix e legado).
- VPS3: 3 jornadas de navegador, incluindo widget oficial real, widget controlado e fallback mobile; POSTs financeiros bloqueados.
- VPS3: PostgreSQL efêmero valida duplicatas, concorrência real entre sessões, períodos calendário, rollback e organização incorreta.
- VPS3: baseline em install/update e 4 invariantes da fronteira service_role aprovados. O update tolera erros antigos de objetos existentes por contrato do runner.
- Contrato da nova RPC regenerado via Supabase CLI e integrado sem substituir tipos não relacionados.
- Compra financeira real, aprovação de cartão e renovação futura não foram executadas. A confirmação dos valores no checkout não certifica essas etapas.

O endpoint legado de outros gateways aceita eventos sem a autenticação introduzida para Hotmart. É dívida preexistente; estes testes não certificam a segurança de todos os gateways. A confirmação de acesso é idempotente; notificações de boas-vindas continuam best effort e não constituem uma fila de entrega.

## Decisão de gateway

O Stripe foi descartado para esta implementação após o requisito essencial de parcelamento bancário brasileiro. Os testes anteriores do sandbox BR (3x R$ 127 e 12x R$ 97 com `pm_card_br`) retornaram `available_plans=[]` e `payment_intent_invalid_parameter`. Isso não prova, isoladamente, impossibilidade para toda conta/configuração de produção. A direção Hotmart foi autorizada depois desses testes; não houve cobrança real no Stripe.
