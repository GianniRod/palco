-- Dashboard, etapa 1: organizaciones, usuarios, sesiones y auditoría (docs/dashboard.md).

-- El cliente de Palco es la "organización": el tenant de todo el sistema.
alter table clients rename to organizations;
alter table venues rename column client_id to organization_id;
alter index venues_client_idx rename to venues_organization_idx;

-- El slug será el subdominio de su página pública.
alter table organizations
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text,
  add column tax_id text,
  add column suspended_at timestamptz,
  add constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  is_platform_admin boolean not null default false,
  must_change_password boolean not null default true,
  disabled_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id uuid not null references users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'ventas', 'portero')),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create index memberships_organization_idx on memberships (organization_id);

-- Se guarda solo el hash del token: si se filtra la base, las sesiones no sirven.
-- acting_organization_id: un admin de Palco viendo el panel de ese cliente.
create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  acting_organization_id uuid references organizations (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user_idx on sessions (user_id);

create table password_resets (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_resets_user_idx on password_resets (user_id);

-- Intentos fallidos de login, para limitar por email y por IP.
create table login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_email_idx on login_attempts (email, attempted_at);
create index login_attempts_ip_idx on login_attempts (ip, attempted_at);

-- actor_email queda escrito: la auditoría tiene que sobrevivir a un usuario borrado.
create table audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references users (id) on delete set null,
  actor_email text not null,
  organization_id uuid references organizations (id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_organization_idx on audit_log (organization_id, created_at desc);

-- Misma función, ahora leyendo la comisión de organizations.
create or replace function hold_seats(
  p_event_id uuid,
  p_seat_ids uuid[],
  p_buyer_email text,
  p_minutes integer default 10
) returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
  v_until timestamptz := now() + make_interval(mins => p_minutes);
  v_wanted integer;
  v_held integer;
  v_percent numeric(5, 2);
  v_total integer;
begin
  select count(distinct seat_id) into v_wanted from unnest(p_seat_ids) as seat_id;

  if v_wanted = 0 then
    raise exception 'no se pidieron butacas' using errcode = 'PA002';
  end if;

  -- Se bloquean siempre en el mismo orden para que dos compras cruzadas no se traben entre sí.
  perform 1 from seats
  where id = any (p_seat_ids) and event_id = p_event_id
  order by id
  for update;

  select organizations.commission_percent into v_percent
  from events
  join venues on venues.id = events.venue_id
  join organizations on organizations.id = venues.organization_id
  where events.id = p_event_id;

  insert into orders (event_id, buyer_email, expires_at, commission_percent)
  values (p_event_id, p_buyer_email, v_until, coalesce(v_percent, 0))
  returning id into v_order_id;

  update seats
  set status = 'held', held_until = v_until, order_id = v_order_id
  where id = any (p_seat_ids)
    and event_id = p_event_id
    and (status = 'free' or (status = 'held' and held_until < now()));

  get diagnostics v_held = row_count;

  -- El error deshace también la orden y las butacas ya tomadas.
  if v_held <> v_wanted then
    raise exception 'butacas no disponibles' using errcode = 'PA001';
  end if;

  select coalesce(sum(sectors.price), 0) into v_total
  from seats join sectors on sectors.id = seats.sector_id
  where seats.order_id = v_order_id;

  update orders
  set total = v_total,
      commission_amount = round(v_total * commission_percent / 100)
  where id = v_order_id;

  return v_order_id;
end;
$$;
