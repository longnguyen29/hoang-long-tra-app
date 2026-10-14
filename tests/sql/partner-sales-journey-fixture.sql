-- Additional representative columns for isolated sales-journey SQL only.
-- Supabase's service_role bypasses RLS; this local role must model that property.
alter role service_role bypassrls;
grant select on public.trade_opportunities to service_role;
alter table public.orders add column stage text,add column health text,add column lines jsonb default '[]',add column shipping_carrier text,add column tracking_code text,add column carrier_status_code text,add column carrier_status_name text,add column carrier_status_at timestamptz,add column delivered_at timestamptz,add column note text,add column tracking_token text,add column tax_number text;
alter table public.trade_quotes add column status text default 'draft',add column sent_at timestamptz,add column updated_at timestamptz default now(),add column note text,add column total numeric;
create table public.sample_requests(id text primary key,opportunity_id text,status text,sent_at timestamptz,updated_at timestamptz default now(),phone text,address text,note text);
create table public.procedure_runs(id uuid primary key default gen_random_uuid(),order_id text unique references public.orders(id),delivery_due_at timestamptz,next_action text,assigned_to uuid);
create table public.order_events(id uuid primary key default gen_random_uuid(),order_id text references public.orders(id),created_at timestamptz default now(),actor text,message text);
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
