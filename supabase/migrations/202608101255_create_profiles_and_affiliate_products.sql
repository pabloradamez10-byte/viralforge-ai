create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'USER' check (role in ('USER','ADMIN')),
  plan text not null default 'FREE' check (plan in ('FREE','PRO','AGENCY','ENTERPRISE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.affiliate_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'SHOPEE' check (platform = 'SHOPEE'),
  title text not null check (char_length(title) between 1 and 200),
  product_url text not null,
  affiliate_url text,
  image_url text,
  category text,
  price numeric(12,2) check (price is null or price >= 0),
  commission_rate numeric(5,2) check (commission_rate is null or commission_rate between 0 and 100),
  sales_count integer not null default 0 check (sales_count >= 0),
  rating double precision check (rating is null or rating between 0 and 5),
  benefits text check (benefits is null or char_length(benefits) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_url)
);

create index affiliate_products_user_updated_idx
  on public.affiliate_products(user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger affiliate_products_set_updated_at before update on public.affiliate_products
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.affiliate_products enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "affiliate_products_select_own" on public.affiliate_products for select to authenticated
using ((select auth.uid()) = user_id);
create policy "affiliate_products_insert_own" on public.affiliate_products for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "affiliate_products_update_own" on public.affiliate_products for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "affiliate_products_delete_own" on public.affiliate_products for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.affiliate_products from anon, authenticated;
grant select, update (name) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.affiliate_products to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
