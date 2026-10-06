-- Reviewed source: current-community-functions.sql, read-only extraction 2026-10-06.
-- Execute only in the authorized DB gate. No data updates; abort on function drift.
BEGIN;
DO $precondition$
BEGIN
  IF md5(pg_get_functiondef('public.claim_community_order(jsonb,integer)'::regprocedure)) <> 'b6422dc5603d3d2cecd884dfcb2d0a77' THEN RAISE EXCEPTION 'pix_auto_function_drift:claim_community_order'; END IF;
  IF md5(pg_get_functiondef('public.community_order_audit()'::regprocedure)) <> '3dd9b7bdaa8bc455acb49086e9970e6f' THEN RAISE EXCEPTION 'pix_auto_function_drift:community_order_audit'; END IF;
  IF md5(pg_get_functiondef('public.finish_community_order(uuid,uuid,jsonb)'::regprocedure)) <> '9e2966052266aa5722d0029dc023bf11' THEN RAISE EXCEPTION 'pix_auto_function_drift:finish_community_order'; END IF;
  IF md5(pg_get_functiondef('public.record_community_payment(jsonb)'::regprocedure)) <> 'af5990931d8b0c425748a5c8c1e217b1' THEN RAISE EXCEPTION 'pix_auto_function_drift:record_community_payment'; END IF;
  IF md5(pg_get_functiondef('public.record_community_financial_review(jsonb)'::regprocedure)) <> '2be4cb87edb33dedd9192795bad4fc9d' THEN RAISE EXCEPTION 'pix_auto_function_drift:record_community_financial_review'; END IF;
  IF (SELECT md5(pg_get_constraintdef(oid)) FROM pg_constraint WHERE conrelid='public.cobranca_pedidos'::regclass AND conname='cobranca_pedidos_check1') IS DISTINCT FROM 'd27db0f17342852cbaf1ec7cd3777c17' THEN RAISE EXCEPTION 'pix_auto_created_constraint_drift'; END IF;
END;
$precondition$;
ALTER TABLE public.cobranca_pedidos ADD COLUMN provider_pix_authorization_id uuid;
ALTER TABLE public.cobranca_pedidos DROP CONSTRAINT cobranca_pedidos_check1;
ALTER TABLE public.cobranca_pedidos ADD CONSTRAINT cobranca_pedidos_check1 CHECK (status<>'created' OR provider_payment_id IS NOT NULL OR provider_subscription_id IS NOT NULL OR provider_installment_id IS NOT NULL OR provider_pix_authorization_id IS NOT NULL);
CREATE UNIQUE INDEX cobranca_pedidos_pix_authorization_unique ON public.cobranca_pedidos (organization_id,provider,environment,provider_pix_authorization_id) WHERE provider_pix_authorization_id IS NOT NULL;
ALTER TABLE public.cobranca_pedidos ADD CONSTRAINT community_pix_automatic_order_binding CHECK ((sold_snapshot->>'price_mode'='recurring_pix_auto' AND sold_snapshot->>'duration_months'='1' AND sold_snapshot->>'installment_count'='1' AND sold_snapshot->>'contract_total_cents'='14700' AND provider_subscription_id IS NULL AND provider_payment_id IS NULL AND provider_installment_id IS NULL AND (status<>'created' OR provider_pix_authorization_id IS NOT NULL)) OR (sold_snapshot->>'price_mode'<>'recurring_pix_auto' AND provider_pix_authorization_id IS NULL));
-- Preserve every existing predicate; extend only CHECK mode enumerations.
DO $checks$
DECLARE c record; d text;
BEGIN
  FOR c IN SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE contype='c' AND conrelid IN
      ('public.cobranca_pedidos'::regclass,'public.cobranca_competencias'::regclass,'public.cobranca_assinaturas'::regclass)
    AND pg_get_constraintdef(oid) LIKE '%price_mode%' AND pg_get_constraintdef(oid) LIKE '%recurring_card%'
  LOOP
    d:=replace(c.def, '''recurring_card''::text', '''recurring_card''::text, ''recurring_pix_auto''::text');
    IF d=c.def OR c.def NOT LIKE '%ARRAY[%recurring_card%' OR (length(c.def)-length(replace(c.def,'''recurring_card''::text','')))/length('''recurring_card''::text')<>1 THEN RAISE EXCEPTION 'pix_auto_unknown_constraint:%',c.conname; END IF;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tbl,c.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',c.tbl,c.conname,d);
  END LOOP;
END;
$checks$;

CREATE OR REPLACE FUNCTION public.claim_community_order(p_order jsonb, p_lease_seconds integer DEFAULT 120)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p jsonb:=p_order; o public.cobranca_pedidos%rowtype; plan public.cobranca_planos%rowtype; snap jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' or p->>'contract_version' is distinct from '1'
    or p->>'provider' is distinct from 'asaas' or coalesce(p->>'environment','') not in ('production','sandbox')
    or p->>'environment' is distinct from p->>'expected_environment'
    or p - array['contract_version','organization_id','provider','environment','expected_environment','request_key','request_hash',
      'buyer_email','buyer_name','buyer_phone','offer_key','offer_version','price_mode','contract_total_cents','installment_count','currency']<>'{}'::jsonb
    or coalesce(p->>'request_hash','') !~ '^[0-9a-f]{64}$' or length(trim(coalesce(p->>'request_key',''))) not between 1 and 200
    or coalesce(p->>'buyer_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p->>'currency' is distinct from 'BRL' or coalesce(p->>'price_mode','') not in ('pix','installment_card','recurring_card','recurring_pix_auto')
    or jsonb_typeof(p->'contract_total_cents') is distinct from 'number'
    or coalesce(p->>'contract_total_cents','') !~ '^[1-9][0-9]*$'
    or (p->>'contract_total_cents')::numeric>9007199254740991
    or coalesce(p->>'installment_count','') !~ '^([1-9]|1[0-2])$'
    or (p->>'price_mode'<>'installment_card' and (p->>'installment_count')::integer<>1)
    or p_lease_seconds is null or p_lease_seconds not between 1 and 3600
  then raise exception 'invalid_community_order' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('community:order:'||(p->>'organization_id')||':'||(p->>'environment')||':'||(p->>'request_key'),0));
  select * into o from public.cobranca_pedidos where organization_id=(p->>'organization_id')::uuid
    and provider='asaas' and environment=p->>'environment' and request_key=p->>'request_key' for update;
  if found then
    if o.request_hash<>p->>'request_hash' or o.buyer_email<>lower(trim(p->>'buyer_email'))
      or o.buyer_name is distinct from p->>'buyer_name' or o.buyer_phone is distinct from p->>'buyer_phone'
      or o.sold_snapshot->>'offer_key' is distinct from p->>'offer_key'
      or o.sold_snapshot->>'offer_version' is distinct from p->>'offer_version'
      or o.sold_snapshot->>'price_mode' is distinct from p->>'price_mode'
      or o.sold_snapshot->>'contract_total_cents' is distinct from p->>'contract_total_cents'
      or o.sold_snapshot->>'installment_count' is distinct from p->>'installment_count'
    then raise exception 'community_order_identity_conflict' using errcode='22023'; end if;
  else
    select * into plan from public.cobranca_planos where offer_key=p->>'offer_key' and version=(p->>'offer_version')::integer for share;
    if not found or not plan.active then raise exception 'community_offer_inactive_or_missing' using errcode='22023'; end if;
    if p->>'price_mode' in ('recurring_card','recurring_pix_auto') and plan.duration_months<>1 then raise exception 'community_recurring_period_conflict' using errcode='22023'; end if;
    snap:=jsonb_build_object('contract_version',1,'offer_key',plan.offer_key,'offer_version',plan.version,
      'duration_months',plan.duration_months,'products',to_jsonb(plan.products),'resource_profile',plan.resource_profile,'catalog_scope',plan.catalog_scope,
      'price_mode',p->>'price_mode','contract_total_cents',(p->>'contract_total_cents')::bigint,'currency','BRL',
      'installment_count',(p->>'installment_count')::integer,'override_audit',case when plan.override_actor_id is not null
        then jsonb_build_object('actor_user_id',plan.override_actor_id,'reason',plan.override_reason,'evidence_ref',plan.override_evidence_ref) else null end);
    insert into public.cobranca_pedidos(organization_id,provider,environment,request_key,request_hash,buyer_email,buyer_name,buyer_phone,plan_id,sold_snapshot)
      values((p->>'organization_id')::uuid,'asaas',p->>'environment',p->>'request_key',p->>'request_hash',
        lower(trim(p->>'buyer_email')),p->>'buyer_name',p->>'buyer_phone',plan.id,snap) returning * into o;
  end if;
  if o.status='creating' and o.lease_until<=clock_timestamp() then
    update public.cobranca_pedidos set status='uncertain',result=jsonb_build_object('error_code','lease_expired'),updated_at=now()
      where id=o.id returning * into o;
  end if;
  if o.status='failed' and not public.community_order_failure_proof_valid(o.result->'failure_proof') then
    update public.cobranca_pedidos set status='uncertain',result=jsonb_build_object('error_code','legacy_failure_unproved'),updated_at=now()
      where id=o.id returning * into o;
  end if;
  if o.status in ('pending','failed') then
    update public.cobranca_pedidos set status='creating',claim_token=gen_random_uuid(),lease_until=clock_timestamp()+make_interval(secs=>p_lease_seconds),
      attempts=attempts+1,result='{}',updated_at=now() where id=o.id returning * into o;
    return jsonb_build_object('claimed',true,'order',to_jsonb(o));
  end if;
  return jsonb_build_object('claimed',false,'order',to_jsonb(o));
end;
$function$;

CREATE OR REPLACE FUNCTION public.community_order_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare plan public.cobranca_planos%rowtype; snap jsonb;
begin
  if new.status='created' and (new.provider_customer_id is null
    or (new.sold_snapshot->>'price_mode'='recurring_pix_auto' and (new.provider_pix_authorization_id is null or new.provider_subscription_id is not null or new.provider_payment_id is not null or new.provider_installment_id is not null))
    or (new.sold_snapshot->>'price_mode'='pix' and (new.provider_payment_id is null or new.provider_subscription_id is not null or new.provider_installment_id is not null))
    or (new.sold_snapshot->>'price_mode'='recurring_card' and (new.provider_subscription_id is null or new.provider_installment_id is not null))
    or (new.sold_snapshot->>'price_mode'='installment_card' and (new.provider_subscription_id is not null
      or ((new.sold_snapshot->>'installment_count')::integer>1 and new.provider_installment_id is null)
      or (new.provider_installment_id is null and new.provider_payment_id is null))))
  then raise exception 'community_order_gateway_binding_required' using errcode='22023'; end if;
  if new.status='failed' and (not public.community_order_failure_proof_valid(new.result->'failure_proof')
    or coalesce(new.provider_payment_id,new.provider_subscription_id,new.provider_installment_id,new.provider_pix_authorization_id::text) is not null)
  then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
  if tg_op='INSERT' and tg_when='BEFORE' then
    -- Também protege inserção REST service-only: intenção deve ser vendida ativa
    -- e carregar exatamente a versão do plano, sem snapshot fabricado/inativo.
    select * into plan from public.cobranca_planos where id=new.plan_id for share;
    if not found or not plan.active then raise exception 'community_offer_inactive_or_missing' using errcode='22023'; end if;
    if coalesce(new.sold_snapshot->>'price_mode','') not in ('pix','installment_card','recurring_card','recurring_pix_auto')
      or coalesce(new.sold_snapshot->>'contract_total_cents','') !~ '^[1-9][0-9]*$'
      or (new.sold_snapshot->>'contract_total_cents')::numeric>9007199254740991
      or coalesce(new.sold_snapshot->>'installment_count','') !~ '^([1-9]|1[0-2])$'
      or (new.sold_snapshot->>'price_mode'<>'installment_card' and new.sold_snapshot->>'installment_count'<>'1')
      or (new.sold_snapshot->>'price_mode' in ('recurring_card','recurring_pix_auto') and plan.duration_months<>1)
    then raise exception 'community_order_snapshot_conflict' using errcode='22023'; end if;
    snap:=jsonb_build_object('contract_version',1,'offer_key',plan.offer_key,'offer_version',plan.version,
      'duration_months',plan.duration_months,'products',to_jsonb(plan.products),'resource_profile',plan.resource_profile,
      'catalog_scope',plan.catalog_scope,'price_mode',new.sold_snapshot->>'price_mode',
      'contract_total_cents',(new.sold_snapshot->>'contract_total_cents')::bigint,'currency','BRL',
      'installment_count',(new.sold_snapshot->>'installment_count')::integer,'override_audit',case when plan.override_actor_id is not null
        then jsonb_build_object('actor_user_id',plan.override_actor_id,'reason',plan.override_reason,'evidence_ref',plan.override_evidence_ref) else null end);
    if new.sold_snapshot is distinct from snap then raise exception 'community_order_snapshot_conflict' using errcode='22023'; end if;
  end if;
  if tg_op='UPDATE' then
    if (old.status='uncertain' and new.status in ('pending','creating'))
      or (old.status='creating' and new.status='pending')
      or (old.status='failed' and new.status='creating' and not public.community_order_failure_proof_valid(old.result->'failure_proof'))
    then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
    if new.status='failed' and new.result->'failure_proof'->>'kind'='pre_effect_definitive'
      and (old.status<>'creating' or old.lease_until is null or old.lease_until<=clock_timestamp())
    then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
    if old.status='created' and (new.provider_customer_id,new.provider_payment_id,new.provider_subscription_id,new.provider_installment_id,new.provider_pix_authorization_id)
        is distinct from (old.provider_customer_id,old.provider_payment_id,old.provider_subscription_id,old.provider_installment_id,old.provider_pix_authorization_id)
      and (jsonb_typeof(new.result->'reconciliation_evidence_ref') is distinct from 'string'
        or length(trim(coalesce(new.result->>'reconciliation_evidence_ref',''))) not between 1 and 200)
    then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
    if (new.id,new.organization_id,new.provider,new.environment,new.request_key,new.request_hash,
        new.buyer_email,new.buyer_name,new.buyer_phone,new.plan_id,new.sold_snapshot,new.created_at)
      is distinct from (old.id,old.organization_id,old.provider,old.environment,old.request_key,old.request_hash,
        old.buyer_email,old.buyer_name,old.buyer_phone,old.plan_id,old.sold_snapshot,old.created_at)
    then raise exception 'community_order_identity_conflict' using errcode='22023'; end if;
    if (old.provider_customer_id is not null and new.provider_customer_id is distinct from old.provider_customer_id)
      or (old.provider_payment_id is not null and new.provider_payment_id is distinct from old.provider_payment_id)
      or (old.provider_subscription_id is not null and new.provider_subscription_id is distinct from old.provider_subscription_id)
      or (old.provider_installment_id is not null and new.provider_installment_id is distinct from old.provider_installment_id)
      or (old.provider_pix_authorization_id is not null and new.provider_pix_authorization_id is distinct from old.provider_pix_authorization_id)
      or (old.status='created' and new.status<>'created')
    then raise exception 'community_order_identity_conflict' using errcode='22023'; end if;
    if to_jsonb(new) is not distinct from to_jsonb(old) then return new; end if;
  end if;
  if tg_when='BEFORE' then return new; end if;
  insert into public.webhook_events_log(organization_id,provider,event_type,external_id,raw_body,payload_parsed,status,processed_at)
    values(new.organization_id,'generic','community.order.bound','community:order:'||new.id::text,'{}',
      jsonb_build_object('order_id',new.id,'environment',new.environment,'external_reference',new.external_reference,
        'request_hash',new.request_hash,'status',new.status,'attempts',new.attempts,'result',new.result),'processed',now());
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finish_community_order(p_order_id uuid, p_claim_token uuid, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare o public.cobranca_pedidos%rowtype; k text; v_status text; v_ids jsonb;
begin
  if jsonb_typeof(p_result) is distinct from 'object' or jsonb_typeof(p_result->'status') is distinct from 'string'
    or coalesce(p_result->>'status','') not in ('created','uncertain','failed')
    or p_result - array['status','price_mode','installment_count','provider_customer_id','provider_payment_id','provider_subscription_id','provider_pix_authorization_id','provider_installment_id','error_code','reconciliation_evidence_ref','failure_proof']<>'{}'::jsonb
    or p_claim_token is null
  then raise exception 'invalid_community_order_result' using errcode='22023'; end if;
  foreach k in array array['provider_customer_id','provider_payment_id','provider_subscription_id','provider_pix_authorization_id','provider_installment_id','reconciliation_evidence_ref','error_code'] loop
    if p_result ? k and p_result->k<>'null'::jsonb and (jsonb_typeof(p_result->k) is distinct from 'string'
      or length(trim(p_result->>k)) not between 1 and (case when k='error_code' then 100 else 200 end))
    then raise exception 'invalid_community_order_result' using errcode='22023'; end if;
  end loop;
  if p_result->>'error_code' is not null and p_result->>'error_code' !~ '^[a-zA-Z0-9_.:-]{1,100}$'
    or (p_result ? 'failure_proof' and (p_result->>'status'<>'failed' or not public.community_order_failure_proof_valid(p_result->'failure_proof')))
    or (p_result ? 'price_mode' and (jsonb_typeof(p_result->'price_mode') is distinct from 'string' or p_result->>'price_mode' not in ('pix','installment_card','recurring_card','recurring_pix_auto')))
    or (p_result ? 'installment_count' and (jsonb_typeof(p_result->'installment_count') is distinct from 'number' or coalesce(p_result->>'installment_count','') !~ '^([1-9]|1[0-2])$'))
  then raise exception 'invalid_community_order_result' using errcode='22023'; end if;
  select * into o from public.cobranca_pedidos where id=p_order_id for update;
  if not found or o.claim_token is distinct from p_claim_token or o.status not in ('creating','uncertain','created')
  then raise exception 'community_order_claim_conflict' using errcode='22023'; end if;
  foreach k in array array['provider_customer_id','provider_payment_id','provider_subscription_id','provider_pix_authorization_id','provider_installment_id'] loop
    if to_jsonb(o)->>k is not null and p_result->>k is not null and to_jsonb(o)->>k<>p_result->>k
    then raise exception 'community_order_identity_conflict' using errcode='22023'; end if;
  end loop;
  if p_result->>'provider_pix_authorization_id' is not null then perform (p_result->>'provider_pix_authorization_id')::uuid; end if;
  v_status:=p_result->>'status';
  if v_status='failed' and not (p_result ? 'failure_proof') then v_status:='uncertain'; end if;
  v_ids:=jsonb_build_object('provider_customer_id',coalesce(p_result->>'provider_customer_id',o.provider_customer_id),
    'provider_payment_id',coalesce(p_result->>'provider_payment_id',o.provider_payment_id),
    'provider_subscription_id',coalesce(p_result->>'provider_subscription_id',o.provider_subscription_id),
    'provider_pix_authorization_id',coalesce(p_result->>'provider_pix_authorization_id',o.provider_pix_authorization_id::text),
    'provider_installment_id',coalesce(p_result->>'provider_installment_id',o.provider_installment_id));
  if o.status='created' and v_status<>'created' then raise exception 'community_order_identity_conflict' using errcode='22023'; end if;
  if v_status='failed' and (coalesce(v_ids->>'provider_payment_id',v_ids->>'provider_subscription_id',v_ids->>'provider_installment_id',v_ids->>'provider_pix_authorization_id') is not null
    or (p_result->'failure_proof'->>'kind'='pre_effect_definitive' and (o.status<>'creating' or o.lease_until is null or o.lease_until<=clock_timestamp())))
  then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
  if v_status='created' and (jsonb_typeof(p_result->'price_mode') is distinct from 'string'
    or jsonb_typeof(p_result->'installment_count') is distinct from 'number'
    or p_result->>'price_mode' is distinct from o.sold_snapshot->>'price_mode'
    or p_result->>'installment_count' is distinct from o.sold_snapshot->>'installment_count'
    or p_result->>'provider_customer_id' is null
    or (p_result->>'price_mode'='recurring_pix_auto' and (p_result->>'provider_pix_authorization_id' is null or p_result->>'provider_payment_id' is not null or p_result->>'provider_subscription_id' is not null or p_result->>'provider_installment_id' is not null))
    or (p_result->>'price_mode'='pix' and (p_result->>'provider_payment_id' is null or p_result->>'provider_subscription_id' is not null or p_result->>'provider_installment_id' is not null))
    or (p_result->>'price_mode'='recurring_card' and (p_result->>'provider_subscription_id' is null or p_result->>'provider_installment_id' is not null))
    or (p_result->>'price_mode'='installment_card' and (p_result->>'provider_subscription_id' is not null
      or ((p_result->>'installment_count')::integer>1 and p_result->>'provider_installment_id' is null)
      or (p_result->>'provider_installment_id' is null and p_result->>'provider_payment_id' is null))))
  then raise exception 'community_order_gateway_binding_required' using errcode='22023'; end if;
  if o.status='created' then
    if (v_ids->>'provider_customer_id',v_ids->>'provider_payment_id',v_ids->>'provider_subscription_id',v_ids->>'provider_installment_id',v_ids->>'provider_pix_authorization_id')
      is not distinct from (o.provider_customer_id,o.provider_payment_id,o.provider_subscription_id,o.provider_installment_id,o.provider_pix_authorization_id::text) then return to_jsonb(o); end if;
    if coalesce(p_result->>'reconciliation_evidence_ref','')='' then raise exception 'community_order_reconciliation_required' using errcode='22023'; end if;
  end if;
  update public.cobranca_pedidos set status=v_status,
    provider_customer_id=v_ids->>'provider_customer_id',provider_payment_id=v_ids->>'provider_payment_id',
    provider_pix_authorization_id=(v_ids->>'provider_pix_authorization_id')::uuid,
    provider_subscription_id=v_ids->>'provider_subscription_id',provider_installment_id=v_ids->>'provider_installment_id',
    result=jsonb_strip_nulls(jsonb_build_object('error_code',p_result->>'error_code','reconciliation_evidence_ref',p_result->>'reconciliation_evidence_ref',
      'failure_proof',p_result->'failure_proof')),lease_until=null,updated_at=now() where id=o.id returning * into o;
  return to_jsonb(o);
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_community_payment(p_payment jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
 SET "TimeZone" TO 'UTC'
AS $function$
declare
  p jsonb:=p_payment; v_plan public.cobranca_planos%rowtype;
  v_order public.cobranca_pedidos%rowtype; v_checkout_order_id uuid; v_existing_sub boolean;
  v_sub public.cobranca_assinaturas%rowtype; v_activation public.cobranca_competencias%rowtype;
  v_payment public.cobranca_pagamentos%rowtype; v_enrollment public.cobranca_club_matriculas%rowtype;
  v_org uuid; v_os uuid; v_club text; v_user uuid; v_env text; v_email text; v_identity text;
  v_key text; v_date date; v_start timestamptz; v_end timestamptz; v_paid timestamptz; v_verified timestamptz;
  v_amount bigint; v_total bigint; v_grace integer; v_count integer; v_number integer;
  v_snapshot jsonb; v_journal jsonb; v_event_key text; v_product text; v_products text[];
  v_proof jsonb; v_bounds jsonb; v_anchor timestamptz; v_update_clock boolean;
  v_clock_payment public.cobranca_pagamentos%rowtype; v_earlier_payment public.cobranca_pagamentos%rowtype;
  v_duplicate_payment boolean:=false; v_duplicate_activation boolean:=false;
begin
  -- Grants limitam este boundary ao service_role. expected_environment vem do
  -- adapter/credencial confiável; não é verificação independente do Asaas.
  if jsonb_typeof(p) is distinct from 'object' or p->>'contract_version' is distinct from '1'
    or p->>'provider' is distinct from 'asaas' or coalesce(p->>'environment','') not in ('production','sandbox')
    or p->>'environment' is distinct from p->>'expected_environment'
    or coalesce(p->>'status','') not in ('CONFIRMED','RECEIVED')
    or p->>'currency' is distinct from 'BRL'
    or coalesce(p->>'price_mode','') not in ('pix','installment_card','recurring_card','recurring_pix_auto')
    or coalesce(p->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(p->>'competence_date','') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p->>'amount_cents','') !~ '^[1-9][0-9]*$'
    or coalesce(p->>'expected_amount_cents','') !~ '^[1-9][0-9]*$'
    or coalesce(p->>'contract_total_cents','') !~ '^[1-9][0-9]*$'
    or coalesce(p->>'offer_version','') !~ '^[1-9][0-9]*$'
    or p - array['contract_version','provider','environment','expected_environment','organization_id',
      'os_organization_id','club_organization_id','auth_user_id','email','customer_id','provider_subscription_id','provider_pix_authorization_id',
      'order_id','checkout_order_id','payment_id','event_id','offer_key','offer_version','competence_key','competence_date','period_start',
      'period_end','paid_at','verified_paid_at','amount_cents','expected_amount_cents','contract_total_cents','currency',
      'price_mode','installment_count','installment_number','status','grace_days','club_enrollment_verification','confirmation_proof'] <> '{}'::jsonb
    or jsonb_typeof(p->'amount_cents') is distinct from 'number'
    or jsonb_typeof(p->'expected_amount_cents') is distinct from 'number'
    or jsonb_typeof(p->'contract_total_cents') is distinct from 'number'
    or coalesce(p->'club_enrollment_verification'->>'outcome','unresolved') not in ('unresolved','no_prior_verified','preexisting_verified')
    or (p ? 'confirmation_proof' and (jsonb_typeof(p->'confirmation_proof') is distinct from 'object'
      or p->'confirmation_proof'->>'source'='legacy_trusted_timestamp'))
    or (p->>'paid_at' is not null and p->>'paid_at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$')
    or (p->>'verified_paid_at' is not null and p->>'verified_paid_at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$')
  then raise exception 'invalid_community_payment' using errcode='22023'; end if;
  foreach v_key in array array['customer_id','order_id','payment_id','event_id','offer_key'] loop
    if length(trim(coalesce(p->>v_key,''))) not between 1 and 200
    then raise exception 'invalid_community_identity' using errcode='22023'; end if;
  end loop;
  v_org:=(p->>'organization_id')::uuid; v_os:=(p->>'os_organization_id')::uuid;
  v_club:=p->>'club_organization_id'; v_user:=(p->>'auth_user_id')::uuid;
  v_env:=p->>'environment'; v_email:=lower(trim(p->>'email'));
  v_date:=(p->>'competence_date')::date; v_start:=(p->>'period_start')::timestamptz;
  v_end:=(p->>'period_end')::timestamptz; v_paid:=(p->>'paid_at')::timestamptz; v_verified:=(p->>'verified_paid_at')::timestamptz;
  if not (p ? 'confirmation_proof') and (v_paid is null or v_verified is null)
  then raise exception 'community_confirmation_proof_required' using errcode='22023'; end if;
  v_proof:=public.community_confirmation_proof(p->'confirmation_proof',v_verified,
    'legacy:payment:'||md5(v_env||':'||(p->>'payment_id')));
  v_bounds:=public.community_confirmation_bounds(v_proof);
  if (v_proof->>'precision'<>'instant' and (v_paid is not null or v_verified is not null))
    or (v_verified is not null and v_verified is distinct from (v_bounds->>'confirmed_at')::timestamptz)
  then raise exception 'community_confirmation_timestamp_conflict' using errcode='22023'; end if;
  v_verified:=(v_bounds->>'confirmed_at')::timestamptz;
  v_amount:=(p->>'amount_cents')::bigint; v_total:=(p->>'contract_total_cents')::bigint;
  v_grace:=coalesce((p->>'grace_days')::integer,7);
  v_count:=(p->>'installment_count')::integer; v_number:=(p->>'installment_number')::integer;
  if v_org is null or v_start is null or v_end is null
    or v_date not between date '2020-01-01' and date '2100-12-31'
    or (v_paid is not null and (not isfinite(v_paid) or v_paid<timestamptz '2020-01-01 UTC' or v_paid>v_verified))
    or v_amount<>(p->>'expected_amount_cents')::bigint or v_amount>v_total
    or v_total>9007199254740991 or v_grace not between 0 and 365
    or v_count is null or v_number is null or v_count not between 1 and 12 or v_number not between 1 and v_count
    or (p->>'price_mode'<>'installment_card' and v_count<>1) or (v_count=1 and v_amount<>v_total)
    or (v_club is not null and length(trim(v_club)) not between 1 and 200)
    or (p->>'provider_subscription_id' is not null and length(trim(p->>'provider_subscription_id')) not between 1 and 200)
    or (p->>'price_mode'='recurring_card' and coalesce(p->>'provider_subscription_id','')='')
  then raise exception 'invalid_community_bounds' using errcode='22023'; end if;
  if p->>'price_mode'='recurring_pix_auto' and (p->>'checkout_order_id' is null or p->>'provider_pix_authorization_id' is null or p->>'provider_subscription_id' is not null or v_count<>1 or v_number<>1 or v_total<>14700)
    or (p->>'price_mode'<>'recurring_pix_auto' and p->>'provider_pix_authorization_id' is not null) then raise exception 'community_pix_automatic_binding_conflict' using errcode='22023'; end if;
  if p->>'provider_pix_authorization_id' is not null then perform (p->>'provider_pix_authorization_id')::uuid; end if;
  v_identity:=case when p->>'price_mode'='recurring_pix_auto' then 'pixauto:'||(p->>'provider_pix_authorization_id') when p->>'provider_subscription_id' is not null
    then 'subscription:'||(p->>'provider_subscription_id') else 'order:'||(p->>'order_id') end;
  v_key:=case p->>'price_mode' when 'recurring_pix_auto' then 'pixauto:'||(p->>'provider_pix_authorization_id')||':'||v_date::text when 'recurring_card'
    then 'subscription:'||(p->>'provider_subscription_id')||':'||v_date::text
    when 'installment_card' then 'installment:'||(p->>'order_id') else 'order:'||(p->>'order_id') end;
  if p->>'competence_key' is distinct from v_key then raise exception 'community_competence_identity_conflict' using errcode='22023'; end if;
  -- Ordem global estável: assinatura, competência, cobrança, evento, matrícula.
  perform pg_advisory_xact_lock(hashtextextended('community:subscription:'||v_env||':'||v_identity,0));
  perform pg_advisory_xact_lock(hashtextextended('community:activation:'||v_env||':'||v_key,0));
  perform pg_advisory_xact_lock(hashtextextended('community:payment:'||v_env||':'||(p->>'payment_id'),0));
  v_event_key:='community:v1:asaas:'||v_env||':'||(p->>'event_id');
  perform pg_advisory_xact_lock(hashtextextended('community:event:'||v_org::text||':'||v_event_key,0));
  select * into v_sub from public.cobranca_assinaturas where provider='asaas' and environment=v_env and identity_key=v_identity for update;
  v_existing_sub:=found;
  v_checkout_order_id:=coalesce((p->>'checkout_order_id')::uuid,v_sub.checkout_order_id);
  if v_checkout_order_id is not null then
    select * into v_order from public.cobranca_pedidos where id=v_checkout_order_id for share;
    if not found or v_order.status<>'created'
      or v_order.provider is distinct from p->>'provider' or v_order.environment is distinct from v_env
      or v_order.organization_id is distinct from v_org or v_order.buyer_email is distinct from v_email
      or v_order.provider_customer_id is distinct from p->>'customer_id'
      or v_order.provider_pix_authorization_id::text is distinct from p->>'provider_pix_authorization_id'
      or v_order.provider_subscription_id is distinct from p->>'provider_subscription_id'
      or v_order.sold_snapshot->>'offer_key' is distinct from p->>'offer_key'
      or v_order.sold_snapshot->>'offer_version' is distinct from p->>'offer_version'
      or v_order.sold_snapshot->>'price_mode' is distinct from p->>'price_mode'
      or v_order.sold_snapshot->>'currency' is distinct from p->>'currency'
      or v_order.sold_snapshot->>'contract_total_cents' is distinct from p->>'contract_total_cents'
      or v_order.sold_snapshot->>'installment_count' is distinct from p->>'installment_count'
      or (v_existing_sub and (v_sub.sold_snapshot is distinct from v_order.sold_snapshot
        or v_sub.plan_id is distinct from v_order.plan_id
        or (v_sub.checkout_order_id is not null and v_sub.checkout_order_id<>v_checkout_order_id)))
    then raise exception 'community_checkout_order_conflict' using errcode='22023'; end if;
    -- Cliente/compra/provedor foram verificados pelo adapter. IDs gravados são
    -- imutáveis; payment.id muda nas parcelas e nas competências recorrentes.
    if (p->>'price_mode'='recurring_pix_auto' and (v_order.provider_pix_authorization_id is null or v_order.provider_subscription_id is not null or v_order.provider_payment_id is not null or v_order.provider_installment_id is not null or p->>'order_id' is distinct from v_order.id::text||':'||v_date::text or v_order.sold_snapshot->>'duration_months' is distinct from '1'))
      or (p->>'price_mode'='pix' and (p->>'order_id' is distinct from v_order.id::text
        or v_order.provider_payment_id is distinct from p->>'payment_id'
        or v_order.provider_installment_id is not null or v_order.provider_subscription_id is not null))
      or (p->>'price_mode'='installment_card' and
        (v_order.provider_subscription_id is not null
          or p->>'order_id' is distinct from coalesce(v_order.provider_installment_id,
            case when v_count=1 then v_order.id::text else null end)
          or (v_order.provider_installment_id is null and v_order.provider_payment_id is distinct from p->>'payment_id')
          or (v_number=1 and v_order.provider_payment_id is not null and v_order.provider_payment_id is distinct from p->>'payment_id')))
      or (p->>'price_mode'='recurring_card' and
        (v_order.provider_subscription_id is null or v_order.provider_installment_id is not null
          or p->>'order_id' is distinct from v_order.id::text||':'||v_date::text
          or (v_order.provider_payment_id is not null
            and not exists(select 1 from public.cobranca_competencias where subscription_id=v_sub.id)
            and v_order.provider_payment_id is distinct from p->>'payment_id')))
    then raise exception 'community_checkout_gateway_conflict' using errcode='22023'; end if;
  end if;
  if v_existing_sub then
    select * into v_plan from public.cobranca_planos where id=v_sub.plan_id;
    if v_sub.organization_id<>v_org or v_sub.customer_id<>p->>'customer_id' or v_sub.email<>v_email
      or v_sub.provider_subscription_id is distinct from p->>'provider_subscription_id'
      or v_sub.sold_snapshot->>'offer_key'<>p->>'offer_key'
      or (v_sub.sold_snapshot->>'offer_version')::integer<>(p->>'offer_version')::integer
      or (v_sub.auth_user_id is not null and v_user is not null and v_sub.auth_user_id<>v_user)
      or (v_os is not null and v_sub.os_organization_id is not null and v_os<>v_sub.os_organization_id)
      or v_sub.club_organization_id is distinct from v_club or v_sub.grace_days<>v_grace
      or v_sub.sold_snapshot->>'price_mode'<>p->>'price_mode'
      or (v_sub.sold_snapshot->>'contract_total_cents')::bigint<>v_total
      or (v_sub.sold_snapshot->>'installment_count')::integer<>v_count
    then raise exception 'community_subscription_identity_conflict' using errcode='22023'; end if;
  else
    if v_checkout_order_id is not null then
      select * into v_plan from public.cobranca_planos where id=v_order.plan_id;
      v_snapshot:=v_order.sold_snapshot;
    else
      -- Histórico sem binding continua aceito somente para oferta ativa.
      select * into v_plan from public.cobranca_planos where offer_key=p->>'offer_key' and version=(p->>'offer_version')::integer for share;
      if not found or not v_plan.active then raise exception 'community_offer_inactive_or_missing' using errcode='22023'; end if;
      v_snapshot:=jsonb_build_object('contract_version',1,'offer_key',v_plan.offer_key,'offer_version',v_plan.version,
        'duration_months',v_plan.duration_months,'products',to_jsonb(v_plan.products),'resource_profile',v_plan.resource_profile,
        'catalog_scope',v_plan.catalog_scope,'price_mode',p->>'price_mode','contract_total_cents',v_total,
        'currency','BRL','installment_count',v_count,'override_audit',case when v_plan.override_actor_id is not null
          then jsonb_build_object('actor_user_id',v_plan.override_actor_id,'reason',v_plan.override_reason,'evidence_ref',v_plan.override_evidence_ref)
          else null end);
    end if;
    v_products:=array(select jsonb_array_elements_text(v_snapshot->'products'));
    if ('club'=any(v_products) and v_club is null) or (not ('os'=any(v_products)) and v_os is not null)
      or (not ('club'=any(v_products)) and v_club is not null)
    then raise exception 'community_product_tenant_conflict' using errcode='22023'; end if;
    if p->>'price_mode' in ('recurring_card','recurring_pix_auto') and (v_snapshot->>'duration_months')::integer<>1
    then raise exception 'community_recurring_period_conflict' using errcode='22023'; end if;
    insert into public.cobranca_assinaturas(organization_id,provider,environment,customer_id,provider_subscription_id,identity_key,
      email,auth_user_id,os_organization_id,club_organization_id,plan_id,sold_snapshot,grace_days,checkout_order_id)
    values(v_org,'asaas',v_env,p->>'customer_id',p->>'provider_subscription_id',v_identity,v_email,v_user,v_os,v_club,v_plan.id,v_snapshot,v_grace,v_checkout_order_id)
    returning * into v_sub;
  end if;
  v_products:=array(select jsonb_array_elements_text(v_sub.sold_snapshot->'products'));
  if v_start is distinct from (v_date::timestamp at time zone 'UTC')
    or v_end is distinct from ((v_date::timestamp+make_interval(months=>(v_sub.sold_snapshot->>'duration_months')::integer)) at time zone 'UTC')
  then raise exception 'community_period_conflict' using errcode='22023'; end if;
  select * into v_activation from public.cobranca_competencias where provider='asaas' and environment=v_env and competence_key=v_key;
  v_duplicate_activation:=found;
  if found then
    if v_activation.subscription_id<>v_sub.id or v_activation.organization_id<>v_org or v_activation.order_id<>p->>'order_id'
      or v_activation.competence_date<>v_date or v_activation.period_start<>v_start or v_activation.period_end<>v_end
      or (v_activation.paid_at is not null and v_paid is not null and v_activation.paid_at<>v_paid)
      or v_activation.contract_total_cents<>v_total or v_activation.price_mode<>p->>'price_mode'
      or v_activation.installment_count<>v_count
    then raise exception 'community_activation_conflict' using errcode='22023'; end if;
  else
    -- Catálogo ativo foi conferido somente ao vender assinatura nova. Renovação
    -- verificada de contrato existente segue seu snapshot, mesmo com oferta inativa.
    insert into public.cobranca_competencias(organization_id,subscription_id,provider,environment,order_id,competence_key,
      competence_date,period_start,period_end,paid_at,contract_total_cents,currency,price_mode,installment_count)
    values(v_org,v_sub.id,'asaas',v_env,p->>'order_id',v_key,v_date,v_start,v_end,v_paid,v_total,'BRL',p->>'price_mode',v_count)
    returning * into v_activation;
  end if;
  select * into v_payment from public.cobranca_pagamentos where provider='asaas' and environment=v_env and provider_payment_id=p->>'payment_id' for update;
  v_duplicate_payment:=found;
  if found then
    if v_payment.organization_id<>v_org or v_payment.activation_id<>v_activation.id or v_payment.amount_cents<>v_amount
      or v_payment.installment_number<>v_number
    then raise exception 'community_payment_conflict' using errcode='22023'; end if;
    v_proof:=public.community_refine_confirmation(public.community_confirmation_proof(v_payment.confirmation_proof,v_payment.verified_paid_at,
      'legacy:payment:'||md5(v_env||':'||(p->>'payment_id'))),v_proof);
    v_verified:=(v_proof->>'confirmed_at')::timestamptz;
    update public.cobranca_pagamentos set status=case when status='RECEIVED' or p->>'status'='RECEIVED' then 'RECEIVED' else 'CONFIRMED' end,
      confirmation_proof=v_proof,verified_paid_at=v_verified where id=v_payment.id returning * into v_payment;
  else
    if v_amount+coalesce((select sum(amount_cents) from public.cobranca_pagamentos where activation_id=v_activation.id),0)>v_total
    then raise exception 'community_order_amount_conflict' using errcode='22023'; end if;
    insert into public.cobranca_pagamentos(organization_id,activation_id,provider,environment,provider_payment_id,amount_cents,
      expected_amount_cents,installment_number,verified_paid_at,status,confirmation_proof)
    values(v_org,v_activation.id,'asaas',v_env,p->>'payment_id',v_amount,v_amount,v_number,v_verified,p->>'status',v_proof) returning * into v_payment;
  end if;
  if 'club'=any(v_products) then
    perform pg_advisory_xact_lock(hashtextextended('community:club:'||v_env||':'||v_club::text||':'||v_email,0));
    v_bounds:=public.community_confirmation_bounds(v_payment.confirmation_proof);
    v_clock_payment:=v_payment;
    v_anchor:=coalesce((v_bounds->>'confirmed_at')::timestamptz,(v_bounds->>'conservative_boundary')::timestamptz);
    select * into v_enrollment from public.cobranca_club_matriculas where environment=v_env and club_organization_id=v_club and email=v_email for update;
    if not found then
      insert into public.cobranca_club_matriculas(organization_id,environment,club_organization_id,email,auth_user_id,origin,first_paid_at,policy_version,
        first_confirmation_payment_id,confirmation_precision,first_paid_date,provider_time_zone,confirmation_lower_bound,conservative_confirmation_boundary,temporal_reconciliation_reason)
      values(v_org,v_env,v_club,v_email,v_user,'reconciliation_required',(v_bounds->>'confirmed_at')::timestamptz,'club-drip-v1',
        v_payment.id,v_bounds->>'precision',(v_bounds->>'confirmed_date')::date,v_bounds->>'provider_time_zone',
        (v_bounds->>'lower_bound')::timestamptz,(v_bounds->>'conservative_boundary')::timestamptz,v_bounds->>'reconciliation_reason') returning * into v_enrollment;
    else
      if v_enrollment.auth_user_id is not null and v_user is not null and v_enrollment.auth_user_id<>v_user
      then raise exception 'community_club_identity_conflict' using errcode='22023'; end if;
      -- Mesmo pagamento pode refinar precisão. Outra compra só substitui o relógio
      -- quando comprovadamente anterior ao limite inferior conhecido. Renovação
      -- nunca usa horário posterior para contornar a primeira prova ainda incerta.
      v_update_clock:=v_enrollment.first_confirmation_payment_id=v_payment.id
        or (v_enrollment.first_confirmation_payment_id is null and v_anchor is not null
          and v_anchor<=v_enrollment.first_paid_at)
        or (v_enrollment.first_confirmation_payment_id is not null and v_anchor is not null
          and v_anchor<coalesce(v_enrollment.confirmation_lower_bound,v_enrollment.first_paid_at));
      if coalesce(v_update_clock,false) then
        -- Reconsidera uma confirmação anterior já gravada enquanto a primeira
        -- prova não tinha horário. Refinar não pode ignorar essa fonte durável.
        select pay.* into v_earlier_payment from public.cobranca_pagamentos pay
          join public.cobranca_competencias a on a.id=pay.activation_id and a.organization_id=pay.organization_id
          join public.cobranca_assinaturas s on s.id=a.subscription_id and s.organization_id=a.organization_id
          cross join lateral (select public.community_confirmation_bounds(public.community_confirmation_proof(pay.confirmation_proof,pay.verified_paid_at,
            'legacy:payment:'||md5(pay.environment||':'||pay.provider_payment_id))) as b) proof
          where s.email=v_email and s.environment=v_env and s.club_organization_id=v_club and s.sold_snapshot->'products' ? 'club'
            and pay.environment=v_env and a.environment=v_env and pay.provider=s.provider and a.provider=s.provider
            and (s.auth_user_id is null or v_enrollment.auth_user_id is null or s.auth_user_id=v_enrollment.auth_user_id)
            and coalesce((proof.b->>'confirmed_at')::timestamptz,(proof.b->>'conservative_boundary')::timestamptz)<(v_bounds->>'lower_bound')::timestamptz
          order by coalesce((proof.b->>'confirmed_at')::timestamptz,(proof.b->>'conservative_boundary')::timestamptz),pay.id limit 1;
        if found then
          v_clock_payment:=v_earlier_payment;
          v_bounds:=public.community_confirmation_bounds(public.community_confirmation_proof(v_clock_payment.confirmation_proof,v_clock_payment.verified_paid_at,
            'legacy:payment:'||md5(v_env||':'||v_clock_payment.provider_payment_id)));
          v_anchor:=coalesce((v_bounds->>'confirmed_at')::timestamptz,(v_bounds->>'conservative_boundary')::timestamptz);
        end if;
        update public.cobranca_club_matriculas set first_confirmation_payment_id=v_clock_payment.id,
          first_paid_at=(v_bounds->>'confirmed_at')::timestamptz,confirmation_precision=v_bounds->>'precision',
          first_paid_date=(v_bounds->>'confirmed_date')::date,provider_time_zone=v_bounds->>'provider_time_zone',
          confirmation_lower_bound=(v_bounds->>'lower_bound')::timestamptz,
          conservative_confirmation_boundary=(v_bounds->>'conservative_boundary')::timestamptz,
          temporal_reconciliation_reason=v_bounds->>'reconciliation_reason',
          origin=case when prior_enrolled_at is not null and
            (((v_bounds->>'confirmed_at')::timestamptz is not null and prior_enrolled_at>(v_bounds->>'confirmed_at')::timestamptz)
              or ((v_bounds->>'conservative_boundary')::timestamptz is not null and prior_enrolled_at>=(v_bounds->>'conservative_boundary')::timestamptz))
            then 'reconciliation_required' else origin end,
          policy_version=case when prior_enrolled_at is not null and
            (((v_bounds->>'confirmed_at')::timestamptz is not null and prior_enrolled_at>(v_bounds->>'confirmed_at')::timestamptz)
              or ((v_bounds->>'conservative_boundary')::timestamptz is not null and prior_enrolled_at>=(v_bounds->>'conservative_boundary')::timestamptz))
            then 'club-drip-v1' else policy_version end,
          protected_release_at=case when origin='reconciliation_required' or (prior_enrolled_at is not null and
            (((v_bounds->>'confirmed_at')::timestamptz is not null and prior_enrolled_at>(v_bounds->>'confirmed_at')::timestamptz)
              or ((v_bounds->>'conservative_boundary')::timestamptz is not null and prior_enrolled_at>=(v_bounds->>'conservative_boundary')::timestamptz))) then null
            when origin='new_paid' then v_anchor+interval '168 hours' else protected_release_at end,
          reconciliation_reason=case when prior_enrolled_at is not null and
            (((v_bounds->>'confirmed_at')::timestamptz is not null and prior_enrolled_at>(v_bounds->>'confirmed_at')::timestamptz)
              or ((v_bounds->>'conservative_boundary')::timestamptz is not null and prior_enrolled_at>=(v_bounds->>'conservative_boundary')::timestamptz))
            then 'prior_enrollment_after_verified_first_payment' else reconciliation_reason end
          where id=v_enrollment.id returning * into v_enrollment;
      end if;
    end if;
    if coalesce(p->'club_enrollment_verification'->>'outcome','unresolved')<>'unresolved' then
      perform public.resolve_community_club_enrollment(v_enrollment.id,p->'club_enrollment_verification');
    end if;
  end if;
  update public.cobranca_assinaturas set financial_status=case
      when not v_duplicate_payment and (paid_until is null or v_end>=paid_until) then
        case when v_end+make_interval(days=>grace_days)>now() then 'paid' else 'overdue' end
      else financial_status end, paid_until=greatest(paid_until,v_end),
    auth_user_id=coalesce(auth_user_id,v_user), os_organization_id=coalesce(os_organization_id,v_os),
    checkout_order_id=coalesce(checkout_order_id,v_checkout_order_id),
    club_enrollment_id=coalesce(club_enrollment_id,v_enrollment.id), updated_at=now() where id=v_sub.id;
  foreach v_product in array v_products loop
    insert into public.cobranca_direitos(organization_id,activation_id,product) values(v_org,v_activation.id,v_product) on conflict(activation_id,product) do nothing;
    insert into public.cobranca_entregas(organization_id,activation_id,product) values(v_org,v_activation.id,v_product) on conflict(activation_id,product) do nothing;
  end loop;
  insert into public.cobranca_notificacoes(organization_id,activation_id,channel)
    select v_org,v_activation.id,c from unnest(array['whatsapp','email']) c on conflict(activation_id,channel) do nothing;
  v_journal:=jsonb_build_object('contract_version',1,'payment_id',v_payment.id,'activation_id',v_activation.id,
    'provider_payment_id',p->>'payment_id');
  if v_checkout_order_id is not null then
    v_journal:=v_journal||jsonb_build_object('checkout_order_id',v_checkout_order_id);
  end if;
  -- Status vive na cobrança monotônica. Journal compara identidade imutável;
  -- status em journal v1 anterior é ignorado no replay, sem reescrever a história.
  select payload_parsed into v_snapshot from public.webhook_events_log where organization_id=v_org
    and external_id=v_event_key and event_type='community.payment.verified';
  if found and (v_snapshot-'status') is distinct from v_journal then raise exception 'community_event_conflict' using errcode='22023'; end if;
  insert into public.webhook_events_log(organization_id,provider,event_type,external_id,raw_body,payload_parsed,status,processed_at)
    values(v_org,'generic','community.payment.verified',v_event_key,'{}',v_journal,'processed',now())
    on conflict(organization_id,external_id) where event_type='community.payment.verified' do nothing;
  return jsonb_build_object('contract_version',1,'subscription_id',v_sub.id,'payment_id',v_payment.id,'activation_id',v_activation.id,
    'duplicate_payment',v_duplicate_payment,'duplicate_activation',v_duplicate_activation,'products',to_jsonb(v_products),
    'period_start',v_start,'period_end',v_end,'club_enrollment_id',v_enrollment.id);
end;
$function$;

ALTER TABLE public.cobranca_competencias ADD CONSTRAINT community_pix_automatic_competence CHECK (price_mode<>'recurring_pix_auto' OR (installment_count=1 AND contract_total_cents=14700 AND competence_key LIKE 'pixauto:%' AND period_start=(competence_date::timestamp AT TIME ZONE 'UTC') AND period_end=((competence_date::timestamp + interval '1 month') AT TIME ZONE 'UTC')));

-- Preserve manual review; include independently verified Pix transaction refunds.
CREATE OR REPLACE FUNCTION public.record_community_financial_review(p_review jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_org constant uuid := '18b103e6-a006-45ac-84d5-62312f45ba77';
  v_order public.cobranca_pedidos%rowtype;
  v_existing public.cobranca_revisoes_financeiras%rowtype;
  v_activation uuid; v_id uuid; v_count integer; v_number integer; v_amount bigint; v_expected bigint;
begin
  if jsonb_typeof(p_review) is distinct from 'object'
    or p_review-array['contract_version','provider','organization_id','environment','checkout_order_id','payment_id',
      'customer_id','provider_subscription_id','provider_installment_id','billing_type','amount_cents','installment_number',
      'status','deleted','refunds','chargeback_status','event_id','source','provider_pix_authorization_id','pix_transaction'] <> '{}'::jsonb
    or p_review->>'contract_version' is distinct from '1'
    or p_review->>'provider' is distinct from 'asaas'
    or p_review->>'organization_id' is distinct from v_org::text
    or p_review->>'environment' is null or p_review->>'environment' not in ('production','sandbox')
    or p_review->>'source' is null or p_review->>'source' not in ('asaas_payment_lookup','asaas_payment_and_pix_transaction_lookup')
    or coalesce(p_review->>'payment_id','') !~ '^pay_[A-Za-z0-9_]+$'
    or coalesce(p_review->>'event_id','') !~ '^[a-zA-Z0-9_:-]{1,180}$'
    or coalesce(p_review->>'status','') !~ '^[A-Z][A-Z0-9_]{0,99}$'
    or jsonb_typeof(p_review->'deleted') is distinct from 'boolean'
    or jsonb_typeof(p_review->'refunds') is distinct from 'array'
    or jsonb_array_length(p_review->'refunds')>100 then
    raise exception 'community_financial_review_invalid' using errcode='22023';
  end if;
  select * into v_order from public.cobranca_pedidos
    where id=(p_review->>'checkout_order_id')::uuid and organization_id=v_org
      and provider='asaas' and environment=p_review->>'environment' and status='created' for update;
  if not found then raise exception 'community_financial_review_order_missing' using errcode='P0002'; end if;
  if p_review->>'customer_id' is distinct from v_order.provider_customer_id
    or p_review->>'provider_subscription_id' is distinct from v_order.provider_subscription_id
    or p_review->>'provider_installment_id' is distinct from v_order.provider_installment_id
    or p_review->>'billing_type' is distinct from
      (case when v_order.sold_snapshot->>'price_mode' in ('pix','recurring_pix_auto') then 'PIX' else 'CREDIT_CARD' end)
    or (v_order.sold_snapshot->>'price_mode'<>'recurring_pix_auto' and v_order.provider_subscription_id is null and v_order.provider_installment_id is null
      and p_review->>'payment_id' is distinct from v_order.provider_payment_id) then
    raise exception 'community_financial_review_binding_conflict' using errcode='22023';
  end if;
  if v_order.sold_snapshot->>'price_mode'='recurring_pix_auto' then
    if p_review->>'provider_pix_authorization_id' is distinct from v_order.provider_pix_authorization_id::text
      or v_order.provider_pix_authorization_id is null
      or p_review->>'provider_subscription_id' is not null
      or p_review->>'provider_installment_id' is not null then
      raise exception 'community_financial_review_binding_conflict' using errcode='22023';
    end if;
  elsif p_review ? 'provider_pix_authorization_id' or p_review ? 'pix_transaction'
    or p_review->>'source' is distinct from 'asaas_payment_lookup' then
    raise exception 'community_financial_review_binding_conflict' using errcode='22023';
  end if;
  if p_review ? 'pix_transaction' then
    if v_order.sold_snapshot->>'price_mode'<>'recurring_pix_auto'
      or p_review->>'source' is distinct from 'asaas_payment_and_pix_transaction_lookup'
      or jsonb_typeof(p_review->'pix_transaction') is distinct from 'object'
      or (p_review->'pix_transaction')-array['id','payment_id','conciliation_identifier','type','status','amount_cents','refunded_cents']<>'{}'::jsonb
      or coalesce(p_review->'pix_transaction'->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or p_review->'pix_transaction'->>'payment_id' is distinct from p_review->>'payment_id'
      or length(trim(coalesce(p_review->'pix_transaction'->>'conciliation_identifier',''))) not between 1 and 200
      or p_review->'pix_transaction'->>'type' is distinct from 'CREDIT'
      or p_review->'pix_transaction'->>'status' is distinct from 'DONE'
      or jsonb_typeof(p_review->'pix_transaction'->'amount_cents') is distinct from 'number'
      or p_review->'pix_transaction'->>'amount_cents' is distinct from p_review->>'amount_cents'
      or jsonb_typeof(p_review->'pix_transaction'->'refunded_cents') is distinct from 'number'
      or coalesce(p_review->'pix_transaction'->>'refunded_cents','') !~ '^[1-9][0-9]*$'
      or (p_review->'pix_transaction'->>'refunded_cents')::numeric>14700 then
      raise exception 'community_financial_review_transaction_conflict' using errcode='22023';
    end if;
  elsif p_review->>'source' is distinct from 'asaas_payment_lookup' then
    raise exception 'community_financial_review_transaction_conflict' using errcode='22023';
  end if;
  v_count=(v_order.sold_snapshot->>'installment_count')::integer;
  v_number=(p_review->>'installment_number')::integer;
  v_amount=(p_review->>'amount_cents')::bigint;
  v_expected=(v_order.sold_snapshot->>'contract_total_cents')::bigint/v_count;
  if v_number=v_count then v_expected=v_expected+(v_order.sold_snapshot->>'contract_total_cents')::bigint%v_count; end if;
  if v_number is null or v_number not between 1 and v_count or v_amount is distinct from v_expected then
    raise exception 'community_financial_review_amount_conflict' using errcode='22023';
  end if;
  select p.activation_id into v_activation from public.cobranca_pagamentos p
    join public.cobranca_competencias a on a.id=p.activation_id and a.organization_id=p.organization_id
    join public.cobranca_assinaturas s on s.id=a.subscription_id and s.organization_id=a.organization_id
    where p.organization_id=v_org and p.provider='asaas' and p.environment=p_review->>'environment'
      and p.provider_payment_id=p_review->>'payment_id' and s.checkout_order_id=v_order.id
      and a.environment=p_review->>'environment' and s.environment=p_review->>'environment';
  if not coalesce((p_review->>'deleted')::boolean
    or p_review->>'status' in ('REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','CHARGEBACK_REQUESTED',
      'CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL')
    or exists(select 1 from jsonb_array_elements(p_review->'refunds') r where r->>'status' in ('PENDING','DONE'))
    or p_review->>'chargeback_status' in ('REQUESTED','IN_DISPUTE','DISPUTE_LOST','DONE')
    or coalesce((p_review->'pix_transaction'->>'refunded_cents')::numeric,0)>0
    or (v_activation is not null and p_review->>'status' not in ('CONFIRMED','RECEIVED')), false) then
    raise exception 'community_financial_review_no_negative_evidence' using errcode='22023';
  end if;
  select * into v_existing from public.cobranca_revisoes_financeiras
    where organization_id=v_org and provider='asaas' and environment=p_review->>'environment' and event_id=p_review->>'event_id';
  if found then
    if v_existing.observation is distinct from p_review then
      raise exception 'community_financial_review_event_conflict' using errcode='22023';
    end if;
    return jsonb_build_object('contract_version',1,'review_id',v_existing.id,'state',v_existing.state,
      'activation_id',v_existing.activation_id,'duplicate',true);
  end if;
  insert into public.cobranca_revisoes_financeiras(organization_id,provider,environment,checkout_order_id,
    provider_payment_id,activation_id,provider_status,event_id,observation)
    values(v_org,'asaas',p_review->>'environment',v_order.id,p_review->>'payment_id',v_activation,
      p_review->>'status',p_review->>'event_id',p_review) returning id into v_id;
  -- No update to paid competencies, delivered products, grants or memberships.
  return jsonb_build_object('contract_version',1,'review_id',v_id,'state','pending','activation_id',v_activation,'duplicate',false);
end;
$function$;

COMMIT;
