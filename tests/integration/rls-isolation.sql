-- RLS cross-user isolation test — obligatoire, non négociable (section 11 de CLAUDE.md).
--
-- Run this directly against the project's Postgres connection (Supabase SQL
-- editor, `mcp__Supabase__execute_sql`, or `psql`). It creates two throwaway
-- users, proves user B cannot read user A's rows, proves user A can read
-- their own rows, and cleans up after itself. A RAISE EXCEPTION aborts the
-- whole transaction with a non-zero-visible-count error — no manual
-- eyeballing required, the test either raises or it doesn't.
--
-- Last run and passed: 2026-09-05, against project yejgppgxwecxkevbqyzf,
-- immediately after adding the receipts rate-limit policy — which is what
-- this test caught: the first version of that policy caused
-- "infinite recursion detected in policy for relation receipts" (fixed in
-- migration 013 by moving the count check into a SECURITY DEFINER function
-- in a non-exposed `private` schema).

do $$
declare
  visible_count int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, instance_id)
  values
    ('11111111-1111-1111-1111-111111111111', 'rls-test-a@example.com', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    ('22222222-2222-2222-2222-222222222222', 'rls-test-b@example.com', '', now(), now(), now(), '{}', '{}', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
  on conflict (id) do nothing;

  -- inventory_items: plain per-user RLS.
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

  execute 'reset role';
  raise notice 'RLS ISOLATION TEST PASSED (inventory_items, receipts + rate limit)';

  delete from auth.users where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
end $$;
