# Checkout: AbacatePay e Stripe Elements

Status: implementação parcial em branch; não publicada.

## Pedido e decisões pendentes

Pix pelo AbacatePay e cartão pelo Stripe Elements, preservando o checkout da landing page. Antes de definir os preços recorrentes, Natan precisa esclarecer se o anual/trimestral mantém o parcelamento anunciado (12x R$ 97 / 3x R$ 127) ou passa a mensalidades recorrentes. Nenhuma decisão sobre compromisso, renovação ou cancelamento foi presumida.

A documentação do AbacatePay restringe assinaturas automáticas a CARD. Pix transparente paga um período de acesso; renovar exige nova cobrança. Referência: https://docs.abacatepay.com/pages/subscriptions/create

## Preparado

- Pix exclusivamente no AbacatePay; erros e timeouts não criam cobrança alternativa no Asaas.
- Plano desconhecido é rejeitado antes da cobrança.
- Tracking não pode sobrescrever plano, comprador ou identificador do pagamento.
- Cliente REST Stripe com versão fixa, idempotência obrigatória em escritas, recusa de dados brutos de cartão e erros sem detalhes privados do provedor.
- Verificador de assinatura Stripe para o corpo original, com tolerância de 5 minutos e suporte à rotação de secrets.

O helper Stripe ainda não está conectado à rota de checkout. O formulário continua usando o cartão legado até a definição comercial e a implementação completa do Elements; nenhuma mudança desta branch chegou à produção.

## Evidência

Na VPS3, os testes de Pix reproduziram cinco falhas anteriores: fallback indevido, fallback após timeout, falta de credencial, metadados sobrescritos e plano inválido. Após a alteração, 16 testes direcionados passaram (Pix, fronteira Stripe e contratos existentes do checkout).

Build ainda não executado: duas tentativas aguardaram o lock canônico de CI e terminaram com código 75. O lock foi preservado. Não há certificação de build nem de E2E da integração completa.

Leitura autenticada do catálogo Stripe em teste: HTTP 200. As duas configurações de produção encontradas no CLI retornaram HTTP 401. A chave publicável foi localizada no painel autenticado. Nenhuma cobrança ou assinatura real foi criada.

AbacatePay: leitura autenticada de loja e webhooks com HTTP 200. Há webhooks para Hub Cashflow, Mimiu e OS; não foi encontrado webhook da landing page. A liberação de acesso deverá ser rastreada pelo fluxo do OS antes de ativar a integração, evitando dois emissores de boas-vindas ou acessos duplicados.

## Trabalho restante

1. Resolver regra comercial do cartão e renovação do Pix.
2. Implementar e montar Stripe Elements, confirmação/3DS, retorno e estado pendente, mantendo os valores da oferta coerentes.
3. Verificar e integrar os eventos pagos/renovados ao provisionamento canônico do OS, com autenticação e idempotência.
4. Configurar credencial Stripe de produção válida e endpoint de webhook; testar primeiro no sandbox.
5. Validar jornadas de Pix/cartão na VPS3, revisar, integrar, publicar e conferir produção.

Foi encontrado material de credenciais versionado no helper legado `_notifications.js`; requer migração para secrets e rotação, sem copiar valores em relatórios ou logs.

## Navegador

Chrome CDP compartilhado preservado. Nenhuma aba foi fechada. A aba de inspeção das chaves Stripe permanece aberta; Natan fecha as abas quando desejar.
