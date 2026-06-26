create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo text default 'tarefa',
  status text default 'pendente',
  prioridade text default 'media',
  data date,
  hora time,
  lead_id uuid references leads(id) on delete set null,
  proprietario_id uuid references proprietarios(id) on delete set null,
  imovel_id uuid references imoveis(id) on delete set null,
  inquilino_id uuid references inquilinos(id) on delete set null,
  corretor_id uuid references corretores(id) on delete set null,
  responsavel text,
  origem text default 'manual',
  created_at timestamptz default now()
);
