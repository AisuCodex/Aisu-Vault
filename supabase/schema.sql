create type public.record_type as enum ('note', 'file');
create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'user',
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.collections (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(owner_id, name)
);

create table public.records (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  collection_id bigint references public.collections(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  type public.record_type not null,
  content text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_or_file check ((type = 'note' and content is not null) or (type = 'file' and storage_path is not null))
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  record_id bigint references public.records(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.records enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and disabled = false);
$$;

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Users read own collections" on public.collections for select using (owner_id = auth.uid() or public.is_admin());
create policy "Users manage own collections" on public.collections for all using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "Users read own records" on public.records for select using (owner_id = auth.uid() or public.is_admin());
create policy "Users create own records" on public.records for insert with check (owner_id = auth.uid() or public.is_admin());
create policy "Users update own records" on public.records for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "Users delete own records" on public.records for delete using (owner_id = auth.uid() or public.is_admin());
create policy "Admins read activity" on public.activity_logs for select using (actor_id = auth.uid() or public.is_admin());
create policy "Authenticated create activity" on public.activity_logs for insert with check (actor_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '')); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public) values ('vault-files', 'vault-files', false) on conflict (id) do nothing;
create policy "Users read own files" on storage.objects for select using (bucket_id = 'vault-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload own files" on storage.objects for insert with check (bucket_id = 'vault-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own files" on storage.objects for delete using (bucket_id = 'vault-files' and (storage.foldername(name))[1] = auth.uid()::text);
