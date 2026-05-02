create table if not exists nutrisaur_users (
  id text primary key,
  chat_id bigint,
  goal jsonb,
  goal_draft jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nutrisaur_meals (
  id text primary key,
  user_id text not null references nutrisaur_users(id) on delete cascade,
  chat_id bigint,
  source text not null check (source in ('text', 'image')),
  raw_input text not null,
  nutrition jsonb not null,
  timestamp timestamptz not null
);

create index if not exists nutrisaur_meals_user_timestamp_idx
  on nutrisaur_meals (user_id, timestamp);

create table if not exists nutrisaur_nutrition_cache (
  key text primary key,
  source text not null check (source in ('text', 'image')),
  input text not null,
  nutrition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hit_count integer not null default 0
);
