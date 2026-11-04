-- Clientes de Palco: cada club, ticketera, productora o venue que usa la plataforma.

create table clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  commission_percent numeric(5, 2) not null default 0
    check (commission_percent between 0 and 100),
  created_at timestamptz not null default now()
);

-- Las salas que ya existían pasan a un cliente de prueba.
insert into clients (id, slug, name, commission_percent)
select '00000000-0000-4000-8000-000000000005', 'cliente-demo', 'Cliente Demo', 5
where exists (select 1 from venues);

alter table venues add column client_id uuid references clients (id) on delete cascade;
update venues set client_id = '00000000-0000-4000-8000-000000000005';
alter table venues alter column client_id set not null;

create index venues_client_idx on venues (client_id);

-- Cada orden guarda su comisión: cambiar el porcentaje del cliente no altera ventas viejas.
alter table orders
  add column commission_percent numeric(5, 2) not null default 0,
  add column commission_amount integer not null default 0 check (commission_amount >= 0);

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

  select clients.commission_percent into v_percent
  from events
  join venues on venues.id = events.venue_id
  join clients on clients.id = venues.client_id
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
