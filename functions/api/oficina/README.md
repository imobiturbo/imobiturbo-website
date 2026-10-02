# Integração oficina — contrato operacional

Datas confirmadas: 27 e 28/10/2026. Programação do projeto: 18h30–22h30 Brasília, 240 minutos por noite, incluindo duas pausas de 10 minutos. Replay por 14 dias até 11/11/2026 às 22h30 Brasília. Ingresso autorizado R$47. Anúncios permanecem PAUSED. Backend não cria cobrança/customer; pode criar apenas paymentLink fixo; root invoca setup administrativo uma vez após deploy para bootstrap do link e webhook dedicado usando a env real, sem revelar ou alterar secrets.

## Endpoints

- `GET /api/oficina/config`: `{checkoutUrl, price:47, datesConfirmed:true}`; usa URL pública configurada ou descobre recurso existente por GET Asaas. Nunca cria; 503 se não encontrado/indisponível.
- `POST /api/oficina/checkout`: sem body/buyer input, procura link fixo por externalReference e nome, pagina limit100 até acabar; só então cria um paymentLink DETACHED, value47, UNDEFINED, maxInstallmentCount1, notificationEnabled=true, dueDateLimitDays1 e callback fixo `/oficina/obrigado/`. Consulta novamente por ID antes de retornar `{ok:true,checkoutUrl,paymentLinkId}`. Sem customer/cobrança. Coalesce requisições simultâneas no mesmo isolate; Asaas não garante unicidade de externalReference entre isolates. Root deve bootstrapar uma vez ANTES de abrir inscrições. Links duplicados/incompatíveis retornam503, sem recriar.
- `POST /api/oficina/lead`: JSON `{name,email,phone,profile:'corretor'|'gestor'|'cliente_atual',consent:true,tracking:{utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,imt_adset_name,imt_adset_id,imt_ad_id,imt_placement,fbclid,fbc,fbp,visitor_id}}`; 200 `{ok:true,checkoutUrl,paymentLinkId}` só depois de receber `data.lead_id` válido do OS e resolver/criar link fixo; 422 dados inválidos; 503 configuração/CRM indisponível. Chave estável SHA256 do produto+telefone normalizado, sem PII no external_id. Corpo limitado a12KB após leitura; rate-limit OS é60/min por fonte, não por visitante.
- `POST /api/oficina/webhook`: autenticação dedicada `asaas-access-token = OFICINA_ASAAS_WEBHOOK_TOKEN`, antes de consultar pagamento real no Asaas. Valida referência exata, paymentLink resolvido/configurado, R$47, PIX/CREDIT_CARD/BOLETO e cobrança avulsa. Status vem exclusivamente do pagamento consultado, não do evento recebido. Produtos não-oficina recebem200 `ignored_product`; falhas verificáveis retornam503/422.
- Webhook genérico existente: busca pagamento real como antes; oficina interceptada antes de `checkoutDetails`/Comunidade/consultoria e recebe200 `delegated_oficina`, sem CRM/membros/tracking. Autenticação legacy NÃO mudou. Não configurar `ASAAS_WEBHOOK_TOKEN` para esse lançamento.
- `POST /api/oficina/setup`: administrativo, exige `Authorization: Bearer <OFICINA_SETUP_TOKEN>` com segredo de pelo menos32 caracteres. Requer token dedicado de webhook entre32–255 caracteres. Resolve/cria link fixo e webhook dedicado; nunca atualiza hooks legados. Lista hooks paginados e procura nome+URL; conflitos retornam503. Cria com enabled=true, interrupted=false, SEQUENTIALLY, apiVersion3, email operacional aprovado e os seis eventos especificados. Readback valida URL, estado e auth, retornando apenas IDs/URL/flags, nunca tokens. Root deve invocar uma vez antes da abertura; retries reutilizam recursos compatíveis. Não depende de body/identidade de comprador.
- `GET /api/checkout/status` recusa oficina com409 antes dos side effects da Comunidade. Não há endpoint público de consulta de PII/status da oficina nesta entrega; persistência é via webhook autenticado.

## Env obrigatórias — sem fallback literal de segredo

`ASAAS_API_KEY`, `OFICINA_ASAAS_WEBHOOK_TOKEN`, `OFICINA_SETUP_TOKEN` (somente setup), `META_ACCESS_TOKEN` (Purchase Meta), `ZEPTOMAIL_API_KEY`, `ZEPTOMAIL_FROM_EMAIL` (entrega paga), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OFICINA_CRM_ORGANIZATION_ID`, `OFICINA_CRM_SOURCE_ID`, `OFICINA_CRM_FORM_URL`, `OFICINA_CRM_FORM_TOKEN`.

`OFICINA_CRM_FORM_URL` deve apontar ao contrato real `/api/v1/public/form-sources/[path_token]`; bearer em FORM_TOKEN é o segredo da fonte, não path_token. URL e IDs são configuração exclusivamente server-side, nunca incluídos em config pública. Usar env Cloudflare protegidas, sem gravar valores em Git.

`OFICINA_CHECKOUT_URL` e `OFICINA_PAYMENT_LINK_ID` são opcionais: lookup usa o Asaas quando ausentes. Se ID estiver configurado, busca/readback desse ID deve conferir o recurso. Nenhuma env existente ou secret é alterado por este código. Root configura novos segredos dedicados via mecanismo autorizado do Cloudflare, sem substituir os segredos legado. Com ID ausente, webhook consulta o link existente por GET para validar `payment.paymentLink`.

## Fonte CRM dedicada: ação do root, não executada pelo delegado

Contrato verificado no checkout OS: `app/app/api/v1/public/form-sources/[token]/route.ts` reexporta `webhooks/in/[token]/route.ts`; lógica em `app/lib/webhooks/ingest-form-lead.ts`; criação em `app/app/api/v1/leads/_handler.ts`.

Root deve criar/configurar uma `webhook_sources` dedicada, `kind=lead_capture`, `is_active=true`, `status=active`, com pipeline/stage próprios existentes, `config.require_auth=true`, segredo criptografado pelo caminho suportado do OS e field_map de nome/email/telefone. Declarar campos oficina no funil conforme governança local. Não reutilizar a fonte/proxy do Imobicreator.

**Gate indispensável:** esse endpoint real emite `lead.created`. Auditar e desabilitar workflows de saída globais/por fonte/pipeline e vínculos de agentes proativos que possam atingir a oficina. Somente após essa auditoria root registra `config.oficina_no_notifications_confirmed=true`. O marcador é confirmação operacional, NÃO mecanismo de supressão: este código não desabilita workflows nem altera o OS. Sem marcador/configuração pronta, os endpoints retornam503 e não ingerem leads. Mudanças futuras nas automações exigem nova auditoria do root.

O OS recebe campos escalares `oficina_product`, `oficina_profile`, `oficina_consent` e tracking permitido. Não aceita consentimento comercial presumido de comprador hospedado: webhook só envia identidade consultada no provedor, produto e external_id. Cadastro de webhook usa `oficina:payment:<paymentID>`; fonte deduplica recibo por `(organization_id,form_source_id,external_id)` e oportunidade aberta por contato+fonte+pipeline. Contatos usam normalização/dedup do próprio OS.

## Registro de pagamento

No lead CRM pertencente à organização/fonte, `custom_fields._oficina_payments[paymentID]` contém `state` pago/pendente/cancelado, providerStatus, valor47, método, paymentLink e updatedAt. `custom_fields.oficina_payment_status` recebe pendente/pago/cancelado na mesma escrita, para aparecer no card; preserva profile e demais campos. Merge preserva campos irmãos e pagamentos. Source_metadata é somente origem/fonte e nunca é escrito pelos helpers oficina. Escrita preserva CAS de custom_fields e até4 tentativas; falha retorna503 para retry. `sourceConfig` retorna o default_pipeline_id real da fonte. `recordPayment` consulta crm_stages por organization_id e esse pipeline_id, resolve IDs pelos slugs inscricao/pago/acompanhamento/reembolso e exige stage atual conhecido no mesmo funil. Pago move somente inscricao→pago; pendente não move; cancelado/reembolsado move qualquer stage conhecido para reembolso, inclusive acompanhamento. Stage e journal são gravados juntos, com CAS adicional do stage_id atual e filtro do pipeline quando há movimento. Retry relê o card e preserva avanço manual para acompanhamento/reembolso. Duplicata paga não move o card nem regrava journal. Não altera status won/lost, arquivamento ou provisionamento.

Transições monotônicas: pendente→pago→cancelado. Snapshot atrasado não regride pago; duplicata não repete PATCH. Cancelado inclui solicitação de refund/chargeback/deleted e exige revisão humana; reversão para pago não é automática. Estados desconhecidos retornam422 para inspeção, sem fallback para Comunidade. DUNNING_RECEIVED é pendente (não prova de pagamento). RECEIVED_IN_CASH não aceito como pago de link PIX/cartão. Não invoca membros CRM/Club ou WhatsApp. Email transacional pago é tratado pelo outbox descrito abaixo. Somente provider pago, valor47 e link confiável gera Purchase no Hub e Meta CAPI.

Tracking pago: ID estável `oficina-purchase-<paymentID>`, pixel1025303472485246, Graph v25.0 via `META_ACCESS_TOKEN` env, BRL47, content_ids da oficina e URL `/oficina/`. Helper Hub ganha somente variante oficina; defaults da Comunidade/consultoria permanecem. Email/telefone priorizam o contato CRM da mesma organização; UTMs/fbp/fbc/visitor_id vêm da origem preservada no CRM. CAPI usa hash de email/telefone; não usa IP/user-agent do webhook como se fossem do comprador.

Flags `hubPurchaseSent`, `metaPurchaseSent`, `welcomeMailSent`, outbox/lease e event_time inicial ficam persistidos em `_oficina_payments` por paymentID. Retry reenvia apenas canal não confirmado com mesmo event_id. Falha de tracking retorna503, embora pagamento já esteja registrado. Crash entre entrega e flag pode repetir transporte: Hub/Meta deduplicam pelo event_id estável; não prometemos exactly-once de rede.

Após pago, custom_fields privados recebem `oficina_room_e1` e `oficina_room_e2`; não são retornados por config/checkout/lead/status. Email transacional de acesso foi implementado usando exclusivamente `ZEPTOMAIL_API_KEY` e `ZEPTOMAIL_FROM_EMAIL` legítimos em env. Não há WhatsApp. O destinatário é somente o email do comprador consultado no processador, sem fallback ao email de outro proprietário do contato CRM. Salas no CRM, aceitação de API e recebimento na caixa de entrada são evidências distintas; nenhuma entrega real foi executada pelo delegado.

Dedup telefone/fonte reaproveita lead aberto. Se alguém fechar manualmente a oportunidade entre pré-cadastro e checkout, o OS pode criar outra oportunidade; receipt por paymentID impede replays dessa compra de criar indefinidamente. Pagador com telefone/email diferentes pode originar outro contato; não reconciliar por suposição. Metadados não são ledger financeiro separado; representam acompanhamento CRM.

## Validação e pendências

Testes mock em `tests/oficina-checkout.test.cjs`, exclusivamente VPS3 como natan em `/opt/builds/website-oficina-checkout-20261002`. Incluem config, validação de lead, falhas de fonte/credenciais, separação de produtos, estados reais, idempotência, CAS e bloqueio de status genérico. Regressões existentes de checkout devem rodar junto. Nenhum cadastro real, pagamento, mensagem ou configuração externa é parte dessa validação.

Root configura fonte/segredo/env, confirma auditoria de automações e invoca setup para conferir link e webhook dedicado. Nenhuma dessas mutações foi feita pelo delegado. `notificationEnabled=true` foi explicitamente solicitado para futuras cobranças no link: criar o recurso sem comprador não dispara mensagens, mas um comprador futuro poderá receber notificações próprias do Asaas, e comprovar jornada com identidade/pagamento apenas quando autorizado. Hosted link não carrega nossa chave de lead: matching usa identidade do comprador e dedup real do OS.

Referências primárias Asaas consultadas: [payment links](https://docs.asaas.com/docs/creating-a-payment-link) e [payment events](https://docs.asaas.com/docs/payment-events). [Create a payments link](https://docs.asaas.com/reference/create-a-payments-link) e [List payments links](https://docs.asaas.com/reference/list-payments-links) confirmam payload e filtros. Confirmação de `paymentLink` em pagamentos do link e consulta de customer; criar link não comprova pagamento. Campos adicionais do provedor não causam side effects automaticamente.

## Contrato resumido para root, sem dados pessoais

Fonte dedicada e funil sem saídas automáticas → identidade normalizada → recibo externo estável → lead CRM da organização/fonte → pagamento Asaas consultado → custom_fields._oficina_payments por paymentID → Purchase Hub/CAPI e email de acesso privado. POST lead é pré-cadastro, não prova de pagamento. Callback não cria Purchase nem provisiona acesso. Env de link é opcional; ID é resolvido por GET Asaas e propagado como identidade confiável. Provider paymentLink é consultado também quando referência está malformada, impedindo fallback acidental para Comunidade.

## Setup: limites operacionais

Nome do hook: `Oficina Imobiturbo outubro2026`; URL: `https://www.imobiturbo.com.br/api/oficina/webhook`; eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_REFUNDED, PAYMENT_DELETED, PAYMENT_OVERDUE. Asaas envia eventos da conta; filtro por produto acontece no endpoint dedicado, que ignora os demais. Não há filtro de produto no recurso webhook criado.

Readback compara authToken do Asaas internamente e retorna apenas authConfigured=true. Se o provedor ocultar esse campo ou houver configuração divergente, setup falha fechado sem editar hook. Coalescência do link vale por isolate; criação simultânea entre isolates não tem trava distribuída nesta entrega. Bootstrap administrativo serial antes do tráfego é necessário.

Docs oficiais: [Create new Webhook](https://docs.asaas.com/reference/create-new-webhook), [List Webhooks](https://docs.asaas.com/reference/list-webhooks) e [Payment events](https://docs.asaas.com/docs/payment-events). Parâmetros e os seis nomes de eventos foram conferidos.

Root informou auditoria live de seis regras ativas: todas ligadas a funil/fonte antigos, sem match no pipeline/fonte novos. A configuração da fonte deve persistir o marcador operacional de confirmação, mantendo esse gate verificável no runtime. Root declarou os campos oficina e UTM no funil; card_fields inclui profile e payment_status. A gravação preserva won/lost; movimentos de stage seguem o contrato de pagamento acima.

## Evidência desta entrega

Validação final em02/10/2026, VPS3 `vmi3482766`, usuário `natan`, diretório `/opt/builds/website-oficina-checkout-20261002`: **117 testes passaram**, zero falhas, executando oficina + regressões Cal/consultoria/Hotmart/webhook/PIX/tracking; `npm run build:pages` compilou Worker/artefato Pages. Logs no builder: `/tmp/website-oficina-checkout-tests.log` e `/tmp/website-oficina-checkout-build.log`. Node emitiu aviso existente de autodetecção ESM; sem mudança em package/dependências.

Delegado não criou recurso em produção, customer, cobrança, comprador real ou fonte CRM; não enviou Purchase real/mensagem; não alterou secrets/env; não fez push/merge/deploy. Root executa setup/publicação e comprova runtime separadamente. Testes são mocks, não prova de recebimento real no Hub/Meta nem de entrega de acesso ao comprador.

## Entrega transacional e lease CAS

Somente pagamento consultado no Asaas, valor47, link de identidade confiável e estado efetivo pago ativa o email. Conteúdo: salas privadas E1/E2, datas27/28 de outubro2026 às18h30–22h30 Brasília, CSV público aprovado, replay até11/11/2026 às22h30 Brasília e suporte por resposta ao remetente env. Não inclui oferta da Comunidade. `POST lead`, callback, pagamento pendente/reembolsado e webhook legacy não enviam email. Headers usam Zoho-enczapikey, sem duplicar prefixo já presente. Nenhum token/endereço de envio é literal ou buscado em fallback legado.

Outbox reservada no journal `_oficina_payments[paymentID].welcomeDelivery`: sending (lease120s e claimId exclusivo), sent (recibo request_id após EM_104), retry (rejeição4xx estruturada), uncertain (resultado ambíguo). Claim e finalização usam CAS de custom_fields. Simultâneos recebem503 se a lease estiver ocupada; não enviam uma segunda cópia. `welcomeMailSent=true` somente depois de aceitação verificável pela API e persistência do recibo. Tracking e welcome são independentes, com execução via allSettled; falha em um não impede tentar o outro, e retries respeitam flags.

**Lacuna documentada:** documentação oficial descreve `client_reference` como identificador de correlação, sem garantia de chave única/idempotência. Não prometemos exactly-once externo. Aceitação seguida de falha persistente na gravação deixa sending; duplicata não reenvia, e lease expirada vira uncertain. Timeout/JSON inválido/5xx sem prova de rejeição também vira uncertain. Root deve reconciliar no ZeptoMail por client_reference `oficina-welcome-<paymentID>`/request_id: confirmar aceitação e marcar sent, ou provar não aceitação antes de autorizar retry. Sem reconciliação, endpoint continua503; não abrir retries cegos nem apagar journal para destravar fila. HTTPaceito não comprova inbox delivery/bounce.

Telefone ausente: lookup parte de crm_leads da organização e fonte da oficina, com join ao contato e email_normalized exatamente igual ao email verificado pelo Asaas; exige exatamente uma correspondência e telefone válido. Zero/múltiplos/telefone inválido retornam503 antes de captureLead, sem lookup global nem telefone inventado. Comprador sem email verificado não recebe welcome por email de terceiros; suporte precisa resolver a entrega.

**Correção da corrida do OS:** endpoint de formulário reaproveitado pode regravar source_metadata inteiro sem CAS. Todo estado/flag/lease da oficina agora fica em custom_fields._oficina_payments, que esse ramo existing-open do OS não sobrescreve. Os PATCHs oficina alteram custom_fields e, somente em transição de pagamento aplicável, stage_id sob CAS. `_oficina_payments` é reservado ao backend; não declarar como campo editável por usuários/agentes/automações. Demais writers de custom_fields precisam preservar essa chave. Não houve alteração/schema/build do OS. Não há migração automática de eventual journal da versão7303516 em source_metadata: root deve reconciliar/copiar estados anteriores, se existirem, antes de habilitar compradores; nenhuma compra real foi usada nesta entrega.

Fonte primária ZeptoMail: [Send Email](https://www.zoho.com/cpaas/help/api/email-sending.html), autenticação e recibo EM_104/request_id. API usada segue o endpoint legado autorizado `https://api.zeptomail.com/v1.1/email`; documentação atual redireciona à marca CPaaS. Nenhuma requisição de envio real foi feita para verificar compatibilidade ou inbox.

Contrato frontend: cliente_atual é perfil válido para a oficina; ingresso é compra distinta da assinatura existente. Financiar/medir novas vendas da Comunidade somente com prospects novos, excluindo cliente_atual das conversões novas de backend. Purchase da oficina continua válido para ingresso realmente pago de qualquer perfil. Atribuição adicional permitida: utm_id, imt_adset_name, imt_adset_id, imt_ad_id, imt_placement; strings até500 caracteres, sem controle/newline; preservadas no formulário/CRM e payload Hub oficina. fbp/fbc já são permitidos. Nenhum seed de browser altera pixel1025303472485246 ou event_id estável derivado do paymentID verificado no servidor.

Validação desta atualização: **132 testes mock/regressões passaram**, zero falhas, e `npm run build:pages` compilou na VPS3 como natan em `/opt/builds/website-oficina-checkout-20261002`. Logs: `/tmp/website-oficina-welcome-tests.log`, `/tmp/website-oficina-welcome-build.log`. Cobertura adicional: lease concorrente, aceitação seguida de falha CAS, timeout uncertain, retry de rejeição, fallback por email estritamente oficina, sobrescrita concorrente do OS, cliente_atual e atribuição adicional. Não houve envio real, pagamento real, configuração de env ou mudança no OS.

### Oferta Hub e financeiro

Purchase verificado usa offerId público fixo `f8a7e873-472d-5b58-baf4-97dc620c8cb4`, produto oficina, BRL e receita **bruta** de4700 centavos. O helper existente envia Purchase sem campo status (InitiateCheckout separado usa pending), e não aceita campos de líquido/taxas: não foi ampliado nem foi assumida taxa zero. `netValue` numérico finito recebido diretamente do pagamento consultado no Asaas fica no journal CRM `custom_fields._oficina_payments[paymentID].netValue`; ausente continua desconhecido. A oficina é ingresso único DETACHED, sem mensalidade/recorrência. Cliente_atual continua fora da coorte newbuyeronly de Comunidade.

Não vincular campanha Meta USD à oferta BRL contornando currencyMismatch. Modelo financeiro deve explicitar conversão FX e referência temporal; nenhuma mutação Hub/SQL foi realizada neste patch. Root adiciona data-offer-id no HTML e valida ingestão/financeiro real após publicar.

### Patch de movimentação de stages — 02/10/2026

Cobertura adicionada: inscrição pendente/paga, refund após acompanhamento, duplicata paga, pago atrasado após cancelamento, avanço manual concorrente e rejeição de stage/pipeline/tenant estrangeiro. Casos existentes de netValue permanecem. Testes deste patch não foram executados localmente: root replica o commit para seu checkout dedicado na VPS3, como natan em /opt/builds/, e valida sob mutex global /var/lock/imobiturbo-ci.lock. Nenhuma validação de runtime/deploy é alegada por este patch.

## Confirmação hospedada

O checkout usa a confirmação padrão do Asaas, sem callback personalizado. O cadastro da conta não tem domínio configurado; adicionar callback foi recusado com HTTP400. Não alteramos dados comerciais/KYC da conta para resolver a oficina. Salas e material seguem pelo email transacional somente após pagamento verificado. DETACHED continua obrigatório; maxInstallmentCount ausente/nulo é inaplicável à cobrança avulsa, e valores maiores que um são recusados.

## Prontidão e token do hook

O GET oficial de webhooks não retorna `authToken`. Setup confere os campos públicos e, em um hook da oficina com nome e URL exatos, confirma uma escrita autenticada contendo somente o token; nenhum hook de outro produto é alterado. O recibo distingue `write_acknowledged` de `readback_match` sem retornar segredos. Não configura KYC, não gera pagamento e não reativa filas divergentes.

`OFICINA_SETUP_READY=true` é a liberação operacional do root após setup bem-sucedido e auditoria do CRM/credenciais. Sem ela, config, criação pública de checkout e registro de lead ficam fechados. Webhook continua autenticado e verificando o pagamento real, independentemente dessa flag.

## Transporte do webhook

O domínio público respondeu HTTP403 a POSTs de servidor; o mesmo endpoint no domínio estável `imobiturbo-website.pages.dev` respondeu401, comprovando alcance do handler autenticado. O hook da oficina usa esse endereço estável do mesmo produto. Setup migra somente o hook com nome exato e URL anterior conhecida, preservando ID, outros hooks e a política do domínio público. As páginas e o formulário continuam em www.imobiturbo.com.br.

### Calendário aprovado — 02/10/2026

Captação planejada para 05/10/2026; mídia autorizada R$3.000 e anúncios PAUSED. Este patch não abre captação, ativa campanhas ou envia mensagens. URL, externalReference, IDs e ingresso de R$47 permanecem os existentes. A descrição em `_checkout.js` vale somente para eventual criação; o recurso Asaas já existente não é atualizado por este código. Root deve reconciliar sua descrição sem recriar o link.

Não há endpoint de gravação nem gate/default de expiração de replay neste escopo; os links privados do welcome são salas ao vivo. Encerramento real na plataforma que hospedar o replay é gate externo de root, em `2026-11-11T22:30:00-03:00` (`2026-11-12T01:30:00Z`). Não confundir atualização de copy com revogação de acesso provada.

Agenda detalhada em `tools/oficina-web/src/App.tsx`: ambas as noites contínuas de 18h30 a 22h30, pausas 19h30–19h40 e 20h40–20h50. E2 tem oferta opcional da Comunidade (R$997 anuais) 21h10–21h30, depois prática e Q&A até 22h30. Welcome continua estritamente transacional, sem pitch.

Validação deste patch: revisão estática do diff e `git diff --check`; asserts do teste existente de welcome atualizados. Testes, typecheck, lint/design gates, build e prova visual não executados localmente; root executa os gates oficiais na VPS3 antes de publicar. Relatos de testes anteriores acima não validam este patch.
