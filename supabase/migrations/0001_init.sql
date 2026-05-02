-- supabase/migrations/0001_init.sql

-- nanoid function (URL-safe, 21 chars default)
create extension if not exists "pgcrypto";

create or replace function nanoid(size int default 21) returns text language plpgsql as $$
declare
  alphabet text := '_-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  id text := '';
  i int := 0;
  bytes bytea;
begin
  bytes := gen_random_bytes(size);
  for i in 0..size-1 loop
    id := id || substr(alphabet, (get_byte(bytes, i) % 64) + 1, 1);
  end loop;
  return id;
end $$;

-- users (admin)
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- trips
create table trips (
  id           text primary key default ('trip_' || nanoid()),
  name         text not null,
  location     text,
  start_date   date,
  end_date     date,
  share_token  text unique not null,
  created_by   uuid references users(id),
  status       text not null default 'active' check (status in ('active','closed')),
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index trips_share_token_idx on trips(share_token);

-- participants
create table participants (
  id         text primary key default ('part_' || nanoid()),
  trip_id    text not null references trips(id) on delete cascade,
  name       text not null,
  color      text,
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

-- transactions
create table transactions (
  id              text primary key default ('txn_' || nanoid()),
  trip_id         text not null references trips(id) on delete cascade,
  date            date not null,
  time            text,
  description     text not null,
  amount          bigint not null check (amount > 0),
  category        text not null check (category in ('transport','makan','logistik','sewa_alat','tiket','lain')),
  payer_id        text not null references participants(id),
  is_reimbursable boolean not null default false,
  receipt_url     text,
  notes           text,
  source          text not null default 'manual',

  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_amount bigint,
  reviewed_by     uuid references users(id),
  reviewed_at     timestamptz,
  review_note     text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index transactions_trip_date_idx on transactions(trip_id, date desc);
create index transactions_approval_idx on transactions(trip_id, is_reimbursable, status) where is_reimbursable = true;

-- transaction_participants (M:N)
create table transaction_participants (
  transaction_id text not null references transactions(id) on delete cascade,
  participant_id text not null references participants(id),
  primary key (transaction_id, participant_id)
);

-- api_keys
create table api_keys (
  id           text primary key default ('key_' || nanoid()),
  trip_id      text not null references trips(id) on delete cascade,
  key_hash     text not null,
  key_prefix   text not null,
  label        text,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index api_keys_active_idx on api_keys(trip_id) where revoked_at is null;
create index api_keys_prefix_idx on api_keys(key_prefix) where revoked_at is null;

-- idempotency_records
create table idempotency_records (
  key           text primary key,
  api_key_id    text references api_keys(id) on delete cascade,
  request_hash  text not null,
  response_json jsonb not null,
  status_code   smallint not null,
  created_at    timestamptz not null default now()
);
create index idempotency_created_idx on idempotency_records(created_at);

-- audit_logs
create table audit_logs (
  id          bigserial primary key,
  api_key_id  text references api_keys(id) on delete set null,
  endpoint    text not null,
  method      text not null,
  status_code smallint not null,
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_logs_key_idx on audit_logs(api_key_id, created_at desc);

-- updated_at trigger for transactions
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger transactions_updated_at before update on transactions
  for each row execute function set_updated_at();
