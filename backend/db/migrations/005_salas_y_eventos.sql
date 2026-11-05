-- Dashboard, etapas 3 y 4: salas con mapa, eventos con varias funciones, lotes y butacas bloqueadas.

-- La sala queda como lugar físico: la marca ya vive en sites. El mapa es la plantilla de la sala.
alter table venues
  drop column slug,
  drop column logo_url,
  drop column primary_color,
  add column address text,
  add column map jsonb not null default '{"sectors": []}',
  add column updated_at timestamptz not null default now();

-- El evento guarda su propia copia del mapa: si la sala cambia, lo ya vendido no se rompe.
alter table events
  add column organization_id uuid references organizations (id) on delete cascade,
  add column description text not null default '',
  add column image text,
  add column status text not null default 'draft'
    check (status in ('draft', 'published', 'finished', 'cancelled')),
  add column map jsonb not null default '{"sectors": []}',
  add column updated_at timestamptz not null default now();

update events
set organization_id = venues.organization_id, status = 'published'
from venues
where venues.id = events.venue_id;

alter table events alter column organization_id set not null;
create index events_organization_idx on events (organization_id);

-- Una sala con eventos no se puede borrar por accidente.
alter table events drop constraint events_venue_id_fkey;
alter table events add constraint events_venue_id_fkey foreign key (venue_id) references venues (id);

create table performances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index performances_event_idx on performances (event_id, starts_at);

insert into performances (event_id, starts_at) select id, starts_at from events;
alter table events drop column starts_at;

-- Los sectores son del evento (precio y lotes); las butacas y las órdenes, de cada función.
alter table sectors
  add column map_key text,
  add column kind text not null default 'numbered' check (kind in ('numbered', 'general')),
  add column capacity integer check (capacity > 0),
  add column position integer not null default 0,
  alter column price drop not null;

alter table seats add column performance_id uuid references performances (id) on delete cascade;
update seats
set performance_id = performances.id
from performances
where performances.event_id = seats.event_id;
alter table seats
  alter column performance_id set not null,
  drop column event_id,
  add column block_reason text,
  -- Platea y Palco pueden tener cada uno su propia butaca A1.
  add constraint seats_performance_seat_key unique (performance_id, sector_id, row_label, number),
  drop constraint seats_status_check,
  drop constraint seats_check,
  add constraint seats_status_check check (status in ('free', 'held', 'sold', 'blocked')),
  -- Una reservada siempre tiene vencimiento y orden; una vendida, orden; una bloqueada, motivo.
  add constraint seats_state_check check (
    (status = 'free' and held_until is null and order_id is null and block_reason is null)
    or (status = 'held' and held_until is not null and order_id is not null and block_reason is null)
    or (status = 'sold' and held_until is null and order_id is not null and block_reason is null)
    or (status = 'blocked' and held_until is null and order_id is null and block_reason is not null)
  );

create index seats_performance_idx on seats (performance_id);

alter table orders add column performance_id uuid references performances (id) on delete cascade;
update orders
set performance_id = performances.id
from performances
where performances.event_id = orders.event_id;
alter table orders alter column performance_id set not null, drop column event_id;

create index orders_performance_idx on orders (performance_id);

-- Una entrada de ubicación general tiene sector y no tiene butaca.
alter table tickets
  add column sector_id uuid references sectors (id),
  alter column seat_id drop not null;
update tickets set sector_id = seats.sector_id from seats where seats.id = tickets.seat_id;
alter table tickets alter column sector_id set not null;

create table price_lots (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references sectors (id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0),
  quota integer check (quota > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  position integer not null default 0,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index price_lots_sector_idx on price_lots (sector_id, position);

drop function hold_seats(uuid, uuid[], text, integer);

-- Reserva todas las butacas pedidas de una función o ninguna, y devuelve la orden creada.
-- Una reserva vencida cuenta como libre, así que no hace falta limpiarlas.
create function hold_seats(
  p_performance_id uuid,
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

  -- Solo se vende lo publicado.
  select organizations.commission_percent into v_percent
  from performances
  join events on events.id = performances.event_id
  join organizations on organizations.id = events.organization_id
  where performances.id = p_performance_id and events.status = 'published';

  if not found then
    raise exception 'butacas no disponibles' using errcode = 'PA001';
  end if;

  -- Se bloquean siempre en el mismo orden para que dos compras cruzadas no se traben entre sí.
  perform 1 from seats
  where id = any (p_seat_ids) and performance_id = p_performance_id
  order by id
  for update;

  insert into orders (performance_id, buyer_email, expires_at, commission_percent)
  values (p_performance_id, p_buyer_email, v_until, v_percent)
  returning id into v_order_id;

  update seats
  set status = 'held', held_until = v_until, order_id = v_order_id
  where id = any (p_seat_ids)
    and performance_id = p_performance_id
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
