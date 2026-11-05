-- Dashboard, etapa 2: la página pública de cada organización (docs/dashboard.md, sección 3.1).

-- draft es lo que el cliente edita; published, lo que ve el público. Publicar copia uno en el otro.
create table sites (
  organization_id uuid primary key references organizations (id) on delete cascade,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
