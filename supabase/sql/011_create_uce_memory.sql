create table if not exists uce_memories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  memory_type text not null,
  title text not null,
  content text not null,
  sentiment text,
  importance integer default 1,
  source text default 'manual',
  tags text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists uce_interactions (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  channel text,
  direction text,
  message text not null,
  summary text,
  intent text,
  sentiment text,
  status text default 'registrado',
  created_at timestamptz default now()
);

create index if not exists idx_uce_memories_entity
  on uce_memories (entity_type, entity_id);

create index if not exists idx_uce_memories_type
  on uce_memories (memory_type);

create index if not exists idx_uce_memories_importance
  on uce_memories (importance desc);

create index if not exists idx_uce_interactions_entity
  on uce_interactions (entity_type, entity_id);

create index if not exists idx_uce_interactions_created_at
  on uce_interactions (created_at desc);
