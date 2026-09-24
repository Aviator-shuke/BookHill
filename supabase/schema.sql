create table if not exists public.user_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_state enable row level security;

drop policy if exists "Users can read their own sync state" on public.user_sync_state;
create policy "Users can read their own sync state"
on public.user_sync_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own sync state" on public.user_sync_state;
create policy "Users can insert their own sync state"
on public.user_sync_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own sync state" on public.user_sync_state;
create policy "Users can update their own sync state"
on public.user_sync_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own sync state" on public.user_sync_state;
create policy "Users can delete their own sync state"
on public.user_sync_state for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_sync_state to authenticated;
