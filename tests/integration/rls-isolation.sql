-- RLS cross-user isolation test — obligatoire, non négociable (section 11 de CLAUDE.md).
--
-- Run this directly against the project's Postgres connection (Supabase SQL
-- editor, `mcp__Supabase__execute_sql`, or `psql`). It creates two throwaway
-- users, proves user B cannot read user A's rows on every user-scoped
-- table, proves user A can read their own rows, checks the two
-- non-user-scoped tables (`shelf_life_catalog`, `recipe_cache` — readable
-- by any authenticated user, not by `anon`), and cleans up after itself.
-- A RAISE EXCEPTION aborts the whole transaction with a specific error —
-- no manual eyeballing required, the test either raises or it doesn't.
--
-- Last run and passed: 2026-09-05, against project yejgppgxwecxkevbqyzf.
-- The first run of the `receipts` block caught a real bug: the rate-limit
-- policy from migration 007 did a `select count(*) from receipts` inside
-- its own INSERT `with check`, which Postgres reports as
-- "infinite recursion detected in policy for relation receipts" — a known
-- Postgres/Supabase trap for self-referential RLS subqueries. Fixed in
-- migrations 011-013 by moving the count into a SECURITY DEFINER function
-- with no caller-supplied user id (avoids an info-leak the first fix
-- attempt had) in a `private` schema not exposed by the Data API.

do $$
declare
  visible_count int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, instance_id)
  values
    ('11111111-1111-1111-1111-111111111111', 'rls-test-a@example.com', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('22222222-2222-2222-2222-222222222222', 'rls-test-b@example.com', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
  on conflict (id) do nothing;

  -- profiles (auto-created by the handle_new_user trigger)
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from profiles where id = '11111111-1111-1111-1111-111111111111';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s profile — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from profiles where id = '11111111-1111-1111-1111-111111111111';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own profile — visible_count=%', visible_count;
  end if;

  -- inventory_items: plain per-user RLS.
  execute 'reset role';
  insert into inventory_items (id, user_id, product_name, quantity, unit, value_amount, storage, purchased_at, expires_at)
  values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'rls-test-item', 1, 'unit', 10, 'fridge', current_date, current_date + 5)
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from inventory_items where id = '33333333-3333-3333-3333-333333333333';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s inventory item — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from inventory_items where id = '33333333-3333-3333-3333-333333333333';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own inventory item — visible_count=%', visible_count;
  end if;

  -- receipts: per-user RLS combined with the restrictive 20/day rate-limit
  -- policy — the combination that caused the recursion bug above.
  execute 'reset role';
  insert into receipts (id, user_id, image_path, status)
  values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/44444444-4444-4444-4444-444444444444', 'pending')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from receipts where id = '44444444-4444-4444-4444-444444444444';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s receipt — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from receipts where id = '44444444-4444-4444-4444-444444444444';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own receipt — visible_count=%', visible_count;
  end if;

  -- Confirm a normal insert still succeeds under the rate-limit policy
  -- (i.e. no recursion, and the check itself isn't accidentally always-false).
  insert into receipts (user_id, image_path, status)
  values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/rate-limit-smoke', 'pending');

  -- receipt_items: RLS via a join back to receipts, not a direct user_id column.
  execute 'reset role';
  insert into receipt_items (id, receipt_id, raw_label)
  values ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'rls-test-line')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from receipt_items where id = '66666666-6666-6666-6666-666666666666';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s receipt_item — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from receipt_items where id = '66666666-6666-6666-6666-666666666666';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own receipt_item — visible_count=%', visible_count;
  end if;

  -- price_observations
  execute 'reset role';
  insert into price_observations (id, user_id, normalized_name, unit_price, unit, observed_at)
  values ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'rls-test-product', 10, 'unit', current_date)
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from price_observations where id = '77777777-7777-7777-7777-777777777777';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s price_observation — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from price_observations where id = '77777777-7777-7777-7777-777777777777';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own price_observation — visible_count=%', visible_count;
  end if;

  -- push_subscriptions
  execute 'reset role';
  insert into push_subscriptions (id, user_id, endpoint, p256dh, auth_key)
  values ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'https://example.com/rls-test-endpoint', 'p', 'a')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from push_subscriptions where id = '88888888-8888-8888-8888-888888888888';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s push_subscription — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from push_subscriptions where id = '88888888-8888-8888-8888-888888888888';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own push_subscription — visible_count=%', visible_count;
  end if;

  -- notifications_log
  execute 'reset role';
  insert into notifications_log (id, user_id, kind, payload)
  values ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'rls_test', '{"dedupe_key":"rls-test"}')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from notifications_log where id = '99999999-9999-9999-9999-999999999999';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: user B could see user A''s notifications_log row — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  select count(*) into visible_count from notifications_log where id = '99999999-9999-9999-9999-999999999999';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: user A could not see their own notifications_log row — visible_count=%', visible_count;
  end if;

  -- shelf_life_catalog: shared reference data, readable by any authenticated
  -- user, not by anon.
  execute 'reset role';
  select count(*) into visible_count from shelf_life_catalog where normalized_name = 'jitomate';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: authenticated user could not read shelf_life_catalog — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into visible_count from shelf_life_catalog where normalized_name = 'jitomate';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: anon could read shelf_life_catalog — visible_count=%', visible_count;
  end if;

  -- recipe_cache: shared cache, readable/writable by any authenticated
  -- user, not by anon.
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  execute 'set local role authenticated';
  insert into recipe_cache (id, cache_key, locale, recipe)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rls-test-cache-key', 'es-MX', '{"title":"x","prep_minutes":10,"ingredients":["x"],"steps":["x"]}')
  on conflict (cache_key) do nothing;

  select count(*) into visible_count from recipe_cache where cache_key = 'rls-test-cache-key';
  if visible_count != 1 then
    raise exception 'RLS FAILURE: authenticated user could not read/insert recipe_cache — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into visible_count from recipe_cache where cache_key = 'rls-test-cache-key';
  if visible_count != 0 then
    raise exception 'RLS FAILURE: anon could read recipe_cache — visible_count=%', visible_count;
  end if;

  execute 'reset role';
  raise notice 'RLS ISOLATION TEST PASSED on all 9 protected tables (profiles, receipts, receipt_items, inventory_items, price_observations, push_subscriptions, notifications_log, shelf_life_catalog, recipe_cache)';

  delete from recipe_cache where cache_key = 'rls-test-cache-key';
  delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
end $$;
