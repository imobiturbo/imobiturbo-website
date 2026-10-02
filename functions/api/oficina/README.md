# Integração oficina — contrato operacional

Datas confirmadas: 9 e 10/10/2026. Programação do projeto: 19h30–21h30 Brasília. Ingresso autorizado R$47. Anúncios permanecem PAUSED. Backend não cria cobrança/customer; pode criar apenas paymentLink fixo; root invoca setup administrativo uma vez após deploy para bootstrap do link e webhook dedicado usando a env real, sem revelar ou alterar secrets.

## Endpoints

- `GET /api/oficina/config`: `{checkoutUrl, price:47, datesConfirmed:true}`; usa URL pública configurada ou descobre recurso existente por GET Asaas. Nunca cria; 503 se não encontrado/indisponível.
- `POST /api/oficina/checkout`: sem body/buyer input, procura link fixo por externalReference e nome, pagina limit100 até acabar; só então cria um paymentLink DETACHED, value47, UNDEFINED, maxInstallmentCount1, notificationEnabled=true, dueDateLimitDays1 e callback fixo `/oficina/obrigado/`. Consulta novamente por ID antes de retornar `{ok:true,checkoutUrl,paymentLinkId}`. Sem customer/cobrança. Coalesce requisições simultâneas no mesmo isolate; Asaas não garante unicidade de externalReference entre isolates. Root deve bootstrapar uma vez ANTES de abrir inscrições. Links duplicados/incompatíveis retornam503, sem recriar.
- `POST /api/oficina/lead`: JSON `{name,email,phone,profile:'corretor'|'gestor',consent:true,tracking:{utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,fbc,fbp,visitor_id}}`; 200 `{ok:true,checkoutUrl,paymentLinkId}` só depois de receber `data.lead_id` válido do OS e resolver/criar link fixo; 422 dados inválidos; 503 configuração/CRM indisponível. Chave estável SHA256 do produto+telefone normalizado, sem PII no external_id. Corpo limitado a12KB após leitura; rate-limit OS é60/min por fonte, não por visitante.
- `POST /api/oficina/webhook`: autenticação dedicada `asaas-access-token = OFICINA_ASAAS_WEBHOOK_TOKEN`, antes de consultar pagamento real no Asaas. Valida referência exata, paymentLink resolvido/configurado, R$47, PIX/CREDIT_CARD/BOLETO e cobrança avulsa. Status vem exclusivamente do pagamento consultado, não do evento recebido. Produtos não-oficina recebem200 `ignored_product`; falhas verificáveis retornam503/422.
- Webhook genérico existente: busca pagamento real como antes; oficina interceptada antes de `checkoutDetails`/Comunidade/consultoria e recebe200 `delegated_oficina`, sem CRM/membros/tracking. Autenticação legacy NÃO mudou. Não configurar `ASAAS_WEBHOOK_TOKEN` para esse lançamento.
- `POST /api/oficina/setup`: administrativo, exige `Authorization: Bearer <OFICINA_SETUP_TOKEN>` com segredo de pelo menos32 caracteres. Requer token dedicado de webhook entre32–255 caracteres. Resolve/cria link fixo e webhook dedicado; nunca atualiza hooks legados. Lista hooks paginados e procura nome+URL; conflitos retornam503. Cria com enabled=true, interrupted=false, SEQUENTIALLY, apiVersion3, email operacional aprovado e os seis eventos especificados. Readback valida URL, estado e auth, retornando apenas IDs/URL/flags, nunca tokens. Root deve invocar uma vez antes da abertura; retries reutilizam recursos compatíveis. Não depende de body/identidade de comprador.
- `GET /api/checkout/status` recusa oficina com409 antes dos side effects da Comunidade. Não há endpoint público de consulta de PII/status da oficina nesta entrega; persistência é via webhook autenticado.

## Env obrigatórias — sem fallback literal de segredo

`ASAAS_API_KEY`, `OFICINA_ASAAS_WEBHOOK_TOKEN`, `OFICINA_SETUP_TOKEN` (somente setup), `META_ACCESS_TOKEN` (Purchase Meta), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OFICINA_CRM_ORGANIZATION_ID`, `OFICINA_CRM_SOURCE_ID`, `OFICINA_CRM_FORM_URL`, `OFICINA_CRM_FORM_TOKEN`.

`OFICINA_CRM_FORM_URL` deve apontar ao contrato real `/api/v1/public/form-sources/[path_token]`; bearer em FORM_TOKEN é o segredo da fonte, não path_token. URL e IDs são configuração exclusivamente server-side, nunca incluídos em config pública. Usar env Cloudflare protegidas, sem gravar valores em Git.

`OFICINA_CHECKOUT_URL` e `OFICINA_PAYMENT_LINK_ID` são opcionais: lookup usa o Asaas quando ausentes. Se ID estiver configurado, busca/readback desse ID deve conferir o recurso. Nenhuma env existente ou secret é alterado por este código. Root configura novos segredos dedicados via mecanismo autorizado do Cloudflare, sem substituir os segredos legado. Com ID ausente, webhook consulta o link existente por GET para validar `payment.paymentLink`.

## Fonte CRM dedicada: ação do root, não executada pelo delegado

Contrato verificado no checkout OS: `app/app/api/v1/public/form-sources/[token]/route.ts` reexporta `webhooks/in/[token]/route.ts`; lógica em `app/lib/webhooks/ingest-form-lead.ts`; criação em `app/app/api/v1/leads/_handler.ts`.

Root deve criar/configurar uma `webhook_sources` dedicada, `kind=lead_capture`, `is_active=true`, `status=active`, com pipeline/stage próprios existentes, `config.require_auth=true`, segredo criptografado pelo caminho suportado do OS e field_map de nome/email/telefone. Declarar campos oficina no funil conforme governança local. Não reutilizar a fonte/proxy do Imobicreator.

**Gate indispensável:** esse endpoint real emite `lead.created`. Auditar e desabilitar workflows de saída globais/por fonte/pipeline e vínculos de agentes proativos que possam atingir a oficina. Somente após essa auditoria root registra `config.oficina_no_notifications_confirmed=true`. O marcador é confirmação operacional, NÃO mecanismo de supressão: este código não desabilita workflows nem altera o OS. Sem marcador/configuração pronta, os endpoints retornam503 e não ingerem leads. Mudanças futuras nas automações exigem nova auditoria do root.

O OS recebe campos escalares `oficina_product`, `oficina_profile`, `oficina_consent` e tracking permitido. Não aceita consentimento comercial presumido de comprador hospedado: webhook só envia identidade consultada no provedor, produto e external_id. Cadastro de webhook usa `oficina:payment:<paymentID>`; fonte deduplica recibo por `(organization_id,form_source_id,external_id)` e oportunidade aberta por contato+fonte+pipeline. Contatos usam normalização/dedup do próprio OS.

## Registro de pagamento

No lead CRM pertencente à organização/fonte, `source_metadata.oficina_payments[paymentID]` contém `state` pago/pendente/cancelado, providerStatus, valor47, método, paymentLink e updatedAt. `custom_fields.oficina_payment_status` recebe pendente/pago/cancelado na mesma escrita, para aparecer no card; preserva profile e demais campos. Merge preserva outros metadados e pagamentos. Escrita usa CAS dos dois JSONs para evitar perda concorrente e até4 tentativas; falha retorna503 para retry. Não altera status won/lost ou stage, evitando usar refund como automação de arquivamento/provisionamento.

Transições monotônicas: pendente→pago→cancelado. Snapshot atrasado não regride pago; duplicata não repete PATCH. Cancelado inclui solicitação de refund/chargeback/deleted e exige revisão humana; reversão para pago não é automática. Estados desconhecidos retornam422 para inspeção, sem fallback para Comunidade. DUNNING_RECEIVED é pendente (não prova de pagamento). RECEIVED_IN_CASH não aceito como pago de link PIX/cartão. Não invoca membros CRM/Club ou WhatsApp/email neste ramo. Somente provider pago, valor47 e link confiável gera Purchase no Hub e Meta CAPI.

Tracking pago: ID estável `oficina-purchase-<paymentID>`, pixel1025303472485246, Graph v25.0 via `META_ACCESS_TOKEN` env, BRL47, content_ids da oficina e URL `/oficina/`. Helper Hub ganha somente variante oficina; defaults da Comunidade/consultoria permanecem. Email/telefone priorizam o contato CRM da mesma organização; UTMs/fbp/fbc/visitor_id vêm da origem preservada no CRM. CAPI usa hash de email/telefone; não usa IP/user-agent do webhook como se fossem do comprador.

Flags `hubPurchaseSent` e `metaPurchaseSent` e event_time inicial ficam persistidos por paymentID. Retry reenvia apenas canal não confirmado com mesmo event_id. Falha de tracking retorna503, embora pagamento já esteja registrado. Crash entre entrega e flag pode repetir transporte: Hub/Meta deduplicam pelo event_id estável; não prometemos exactly-once de rede.

Após pago, custom_fields privados recebem `oficina_room_e1` e `oficina_room_e2`; não são retornados por config/checkout/lead/status. Nenhum email de boas-vindas ou WhatsApp foi implementado. Root deve declarar esses campos na fonte/funil e definir canal futuro de entrega; ZeptoMail exigiria segredo legítimo em env (sem credencial literal), política/consentimento e recibo idempotente próprios. Configurar salas no CRM não comprova que participante recebeu acesso.

Dedup telefone/fonte reaproveita lead aberto. Se alguém fechar manualmente a oportunidade entre pré-cadastro e checkout, o OS pode criar outra oportunidade; receipt por paymentID impede replays dessa compra de criar indefinidamente. Pagador com telefone/email diferentes pode originar outro contato; não reconciliar por suposição. Metadados não são ledger financeiro separado; representam acompanhamento CRM.

## Validação e pendências

Testes mock em `tests/oficina-checkout.test.cjs`, exclusivamente VPS3 como natan em `/opt/builds/website-oficina-checkout-20261002`. Incluem config, validação de lead, falhas de fonte/credenciais, separação de produtos, estados reais, idempotência, CAS e bloqueio de status genérico. Regressões existentes de checkout devem rodar junto. Nenhum cadastro real, pagamento, mensagem ou configuração externa é parte dessa validação.

Root configura fonte/segredo/env, confirma auditoria de automações e invoca setup para conferir link e webhook dedicado. Nenhuma dessas mutações foi feita pelo delegado. `notificationEnabled=true` foi explicitamente solicitado para futuras cobranças no link: criar o recurso sem comprador não dispara mensagens, mas um comprador futuro poderá receber notificações próprias do Asaas, e comprovar jornada com identidade/pagamento apenas quando autorizado. Hosted link não carrega nossa chave de lead: matching usa identidade do comprador e dedup real do OS.

Referências primárias Asaas consultadas: [payment links](https://docs.asaas.com/docs/creating-a-payment-link) e [payment events](https://docs.asaas.com/docs/payment-events). [Create a payments link](https://docs.asaas.com/reference/create-a-payments-link) e [List payments links](https://docs.asaas.com/reference/list-payments-links) confirmam payload e filtros. Confirmação de `paymentLink` em pagamentos do link e consulta de customer; criar link não comprova pagamento. Campos adicionais do provedor não causam side effects automaticamente.

## Contrato resumido para root, sem dados pessoais

Fonte dedicada e funil sem saídas automáticas → identidade normalizada → recibo externo estável → lead CRM da organização/fonte → pagamento Asaas consultado → metadata por paymentID → Purchase Hub/CAPI e salas privadas. POST lead é pré-cadastro, não prova de pagamento. Callback não cria Purchase nem provisiona acesso. Env de link é opcional; ID é resolvido por GET Asaas e propagado como identidade confiável. Provider paymentLink é consultado também quando referência está malformada, impedindo fallback acidental para Comunidade.

## Setup: limites operacionais

Nome do hook: `Oficina Imobiturbo outubro2026`; URL: `https://www.imobiturbo.com.br/api/oficina/webhook`; eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_REFUNDED, PAYMENT_DELETED, PAYMENT_OVERDUE. Asaas envia eventos da conta; filtro por produto acontece no endpoint dedicado, que ignora os demais. Não há filtro de produto no recurso webhook criado.

Readback compara authToken do Asaas internamente e retorna apenas authConfigured=true. Se o provedor ocultar esse campo ou houver configuração divergente, setup falha fechado sem editar hook. Coalescência do link vale por isolate; criação simultânea entre isolates não tem trava distribuída nesta entrega. Bootstrap administrativo serial antes do tráfego é necessário.

Docs oficiais: [Create new Webhook](https://docs.asaas.com/reference/create-new-webhook), [List Webhooks](https://docs.asaas.com/reference/list-webhooks) e [Payment events](https://docs.asaas.com/docs/payment-events). Parâmetros e os seis nomes de eventos foram conferidos.

Root informou auditoria live de seis regras ativas: todas ligadas a funil/fonte antigos, sem match no pipeline/fonte novos. A configuração da fonte deve persistir o marcador operacional de confirmação, mantendo esse gate verificável no runtime. Root declarou os campos oficina e UTM no funil; card_fields inclui profile e payment_status. A gravação altera apenas esses campos/metadados, sem won/lost nem stage.

## Evidência desta entrega

Validação final em02/10/2026, VPS3 `vmi3482766`, usuário `natan`, diretório `/opt/builds/website-oficina-checkout-20261002`: **117 testes passaram**, zero falhas, executando oficina + regressões Cal/consultoria/Hotmart/webhook/PIX/tracking; `npm run build:pages` compilou Worker/artefato Pages. Logs no builder: `/tmp/website-oficina-checkout-tests.log` e `/tmp/website-oficina-checkout-build.log`. Node emitiu aviso existente de autodetecção ESM; sem mudança em package/dependências.

Delegado não criou recurso em produção, customer, cobrança, comprador real ou fonte CRM; não enviou Purchase real/mensagem; não alterou secrets/env; não fez push/merge/deploy. Root executa setup/publicação e comprova runtime separadamente. Testes são mocks, não prova de recebimento real no Hub/Meta nem de entrega de acesso ao comprador.
