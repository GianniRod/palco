-- Tablas base: sala, función, sectores, órdenes, butacas y entradas.

create table venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table sectors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null,
  price integer not null check (price >= 0), -- en pesos
  unique (event_id, name)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  buyer_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'expired', 'refund_pending')),
  total integer not null default 0 check (total >= 0),
  mp_payment_id text unique,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  sector_id uuid not null references sectors (id) on delete cascade,
  row_label text not null,
  number integer not null check (number > 0),
  status text not null default 'free' check (status in ('free', 'held', 'sold')),
  held_until timestamptz,
  order_id uuid references orders (id),
  unique (event_id, row_label, number),
  -- Una butaca reservada siempre tiene vencimiento y orden; una vendida, orden.
  check (
    (status = 'free' and held_until is null and order_id is null)
    or (status = 'held' and held_until is not null and order_id is not null)
    or (status = 'sold' and held_until is null and order_id is not null)
  )
);

create index seats_event_idx on seats (event_id);
create index seats_order_idx on seats (order_id);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  seat_id uuid not null unique references seats (id),
  token text not null unique, -- lo que va dentro del QR
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Reserva todas las butacas pedidas o ninguna, y devuelve la orden creada.
-- Una reserva vencida cuenta como libre, así que no hace falta limpiarlas.
create function hold_seats(
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

  insert into orders (event_id, buyer_email, expires_at)
  values (p_event_id, p_buyer_email, v_until)
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

  update orders
  set total = (
    select coalesce(sum(sectors.price), 0)
    from seats join sectors on sectors.id = seats.sector_id
    where seats.order_id = v_order_id
  )
  where id = v_order_id;

  return v_order_id;
end;
$$;
