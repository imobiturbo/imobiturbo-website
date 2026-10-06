-- Run with psql ON_ERROR_STOP=1 only against a disposable schema/data clone
-- AFTER pix-automatic-monthly-20261006.sql. Never point this at a real database.
BEGIN;
DO $unit$
DECLARE org uuid:='18b103e6-a006-45ac-84d5-62312f45ba77'; plan public.cobranca_planos%rowtype; intent jsonb; claimed jsonb; o jsonb;
  auth uuid:=gen_random_uuid(); result jsonb; p jsonb; first_result jsonb; renewal_result jsonb;
  n integer; denied boolean; review jsonb; reviewed jsonb; durable_before jsonb; durable_after jsonb;
BEGIN
  IF current_database() !~ '^pix_auto_unit_' THEN RAISE EXCEPTION 'disposable_pix_auto_unit_database_required'; END IF;
  SELECT * INTO plan FROM public.cobranca_planos WHERE active AND duration_months=1 LIMIT 1;
  IF org IS NULL OR plan.id IS NULL THEN RAISE EXCEPTION 'unit_clone_monthly_catalog_fixture_required'; END IF;
  intent:=jsonb_build_object('contract_version',1,'organization_id',org,'provider','asaas','environment','sandbox','expected_environment','sandbox',
    'request_key',gen_random_uuid(),'request_hash',repeat('a',64),'buyer_email','pix-auto-unit@example.invalid','buyer_name','Synthetic unit','buyer_phone','11999999999',
    'offer_key',plan.offer_key,'offer_version',plan.version,'price_mode','recurring_pix_auto','contract_total_cents',14700,'installment_count',1,'currency','BRL');
  claimed:=public.claim_community_order(intent,120); o:=claimed->'order';
  IF claimed->>'claimed'<>'true' THEN RAISE EXCEPTION 'unit_claim_failed'; END IF;
  IF public.claim_community_order(intent,120)->>'claimed'<>'false' THEN RAISE EXCEPTION 'unit_double_click_claimed'; END IF;
  result:=jsonb_build_object('status','created','price_mode','recurring_pix_auto','installment_count',1,'provider_customer_id','cus_pix_auto_unit',
    'provider_pix_authorization_id',auth,'provider_payment_id',null,'provider_subscription_id',null,'provider_installment_id',null);
  denied:=false;
  BEGIN
    PERFORM public.finish_community_order((o->>'id')::uuid,(o->>'claim_token')::uuid,result-'provider_pix_authorization_id');
  EXCEPTION WHEN SQLSTATE '22023' OR check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_missing_authorization_accepted'; END IF;
  o:=public.finish_community_order((o->>'id')::uuid,(o->>'claim_token')::uuid,result);
  IF o->>'provider_subscription_id' IS NOT NULL OR o->>'provider_payment_id' IS NOT NULL THEN RAISE EXCEPTION 'unit_fake_provider_identity'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.finish_community_order((o->>'id')::uuid,(o->>'claim_token')::uuid,result||jsonb_build_object('provider_pix_authorization_id',gen_random_uuid()));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_authorization_mutable'; END IF;
  p:=jsonb_build_object('contract_version',1,'provider','asaas','environment','sandbox','expected_environment','sandbox','organization_id',org,
    'os_organization_id',null,'club_organization_id',case when 'club'=any(plan.products) then '2c7053d4-e46e-435f-8d3a-42c65da30130' else null end,
    'auth_user_id',null,'email','pix-auto-unit@example.invalid','customer_id','cus_pix_auto_unit','provider_subscription_id',null,'provider_pix_authorization_id',auth,
    'checkout_order_id',o->>'id','order_id',(o->>'id')||':2026-10-06','payment_id','pay_pix_auto_unit_initial','event_id','unit_pix_auto_initial',
    'offer_key',plan.offer_key,'offer_version',plan.version,'competence_key','pixauto:'||auth::text||':2026-10-06','competence_date','2026-10-06',
    'period_start','2026-10-06T00:00:00Z','period_end','2026-11-06T00:00:00Z','paid_at',null,'verified_paid_at',null,
    'confirmation_proof',jsonb_build_object('schema_version',1,'precision','unresolved','source','asaas_payment_lookup','evidence_ref','unit:pix-auto'),
    'amount_cents',14700,'expected_amount_cents',14700,'contract_total_cents',14700,'currency','BRL','price_mode','recurring_pix_auto',
    'installment_count',1,'installment_number',1,'status','RECEIVED','grace_days',7,'club_enrollment_verification',jsonb_build_object('outcome','unresolved'));
  first_result:=public.record_community_payment(p);
  IF public.record_community_payment(p)->>'activation_id' IS DISTINCT FROM first_result->>'activation_id' THEN RAISE EXCEPTION 'unit_duplicate_changed_competence'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.record_community_payment(p||jsonb_build_object('provider_pix_authorization_id',gen_random_uuid()));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_wrong_authorization_accepted'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.record_community_payment(p-'checkout_order_id');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_legacy_unbound_auto_accepted'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.record_community_payment(p||jsonb_build_object('period_end','2027-10-06T00:00:00Z'));
  EXCEPTION WHEN SQLSTATE '22023' OR check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_annual_period_accepted'; END IF;
  p:=p||jsonb_build_object('order_id',(o->>'id')||':2026-11-06','payment_id','pay_pix_auto_unit_renewal','event_id','unit_pix_auto_renewal',
    'competence_key','pixauto:'||auth::text||':2026-11-06','competence_date','2026-11-06','period_start','2026-11-06T00:00:00Z','period_end','2026-12-06T00:00:00Z');
  renewal_result:=public.record_community_payment(p);
  IF renewal_result->>'subscription_id' IS DISTINCT FROM first_result->>'subscription_id' OR renewal_result->>'activation_id'=first_result->>'activation_id'
    THEN RAISE EXCEPTION 'unit_renewal_identity_changed'; END IF;
  SELECT count(*) INTO n FROM public.cobranca_competencias WHERE subscription_id=(first_result->>'subscription_id')::uuid;
  IF n<>2 THEN RAISE EXCEPTION 'unit_competence_count:%',n; END IF;
  SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) INTO durable_before FROM public.cobranca_competencias a WHERE subscription_id=(first_result->>'subscription_id')::uuid;
  review:=jsonb_build_object('contract_version',1,'provider','asaas','organization_id',org,'environment','sandbox',
    'checkout_order_id',o->>'id','payment_id','pay_pix_auto_unit_initial','customer_id','cus_pix_auto_unit',
    'provider_subscription_id',null,'provider_installment_id',null,'provider_pix_authorization_id',auth,
    'billing_type','PIX','amount_cents',14700,'installment_number',1,'status','RECEIVED','deleted',false,
    'refunds','[]'::jsonb,'chargeback_status',null,'event_id','unit_tx_refund','source','asaas_payment_and_pix_transaction_lookup',
    'pix_transaction',jsonb_build_object('id',gen_random_uuid(),'payment_id','pay_pix_auto_unit_initial',
      'conciliation_identifier','synthetic-unit-concil','type','CREDIT','status','DONE','amount_cents',14700,'refunded_cents',1000));
  reviewed:=public.record_community_financial_review(review);
  IF reviewed->>'state'<>'pending' OR reviewed->>'activation_id' IS DISTINCT FROM first_result->>'activation_id' THEN RAISE EXCEPTION 'unit_tx_refund_review_not_bound'; END IF;
  IF public.record_community_financial_review(review)->>'duplicate'<>'true' THEN RAISE EXCEPTION 'unit_duplicate_refund_review'; END IF;
  SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) INTO durable_after FROM public.cobranca_competencias a WHERE subscription_id=(first_result->>'subscription_id')::uuid;
  IF durable_before IS DISTINCT FROM durable_after THEN RAISE EXCEPTION 'unit_negative_review_rewrote_paid_competence'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.record_community_financial_review(review||jsonb_build_object('event_id','unit_wrong_tx','pix_transaction',
      (review->'pix_transaction')||jsonb_build_object('payment_id','pay_other')));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_wrong_refund_transaction_accepted'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.record_community_financial_review(review||jsonb_build_object('event_id','unit_wrong_auth','provider_pix_authorization_id',gen_random_uuid()));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'unit_wrong_refund_authorization_accepted'; END IF;
  RAISE NOTICE 'PixAutomatic unit DB verifier passed; all fixture writes rolled back';
END;
$unit$;
ROLLBACK;
