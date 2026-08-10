alter table public.profiles add column access_status text not null default 'PENDING'
check (access_status in ('PENDING','APPROVED','BLOCKED'));

update public.profiles set role = 'ADMIN', access_status = 'APPROVED'
where lower(email) = 'pabloradamez10@gmail.com';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare is_owner boolean := lower(coalesce(new.email, '')) = 'pabloradamez10@gmail.com';
begin
  insert into public.profiles (id, email, name, role, access_status)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when is_owner then 'ADMIN' else 'USER' end,
    case when is_owner then 'APPROVED' else 'PENDING' end);
  return new;
end;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_owner_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'pabloradamez10@gmail.com');
create policy "profiles_admin_update" on public.profiles for update to authenticated
using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'pabloradamez10@gmail.com')
with check (lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'pabloradamez10@gmail.com'
  and lower(email) <> 'pabloradamez10@gmail.com');

revoke update on table public.profiles from authenticated;
grant select, update (access_status) on table public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
