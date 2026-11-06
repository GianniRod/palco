-- Etapa 5: compra. Reserva con butacas y ubicación general, lotes con cupo y entradas reales con QR.

alter table orders drop constraint orders_status_check;
alter table orders
  add constraint orders_status_check
    check (status in ('pending', 'paid', 'expired', 'cancelled', 'refund_pending')),
  add column buyer_name text not null default '',
  add column access_token text unique, -- va en el link que recibe el comprador
  add column client_ip text,           -- solo para limitar reservas en masa
  add column payment_provider text,
  add column payment_reference text,
  add constraint orders_payment_key unique (payment_provider, payment_reference);

create index orders_pending_ip_idx on orders (client_ip, expires_at) where status = 'pending';
create index orders_pending_email_idx on orders (buyer_email, expires_at) where status = 'pending';

-- Una línea por entrada: su sector, su butaca si es numerada, y con qué lote y precio se reservó.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  sector_id uuid not null references sectors (id) on delete cascade,
  seat_id uuid references seats (id) on delete cascade,
  lot_id uuid references price_lots (id) on delete set null,
  unit_price integer not null check (unit_price >= 0)
);

create index order_items_order_idx on order_items (order_id);
create index order_items_sector_idx on order_items (sector_id);
create index order_items_lot_idx on order_items (lot_id);

-- La entrada nace una sola vez por línea: un aviso de pago repetido no duplica nada.
alter table tickets
  drop constraint tickets_seat_id_fkey,
  drop constraint tickets_sector_id_fkey,
  add constraint tickets_seat_id_fkey foreign key (seat_id) references seats (id) on delete cascade,
  add constraint tickets_sector_id_fkey foreign key (sector_id) references sectors (id) on delete cascade,
  add column order_item_id uuid not null unique references order_items (id) on delete cascade,
  add column checked_in_by uuid references users (id) on delete set null;

-- El escáner registra también las entradas reales.
alter table qr_scans add column sold_ticket_id uuid references tickets (id) on delete cascade;
create index qr_scans_sold_ticket_idx on qr_scans (sold_ticket_id, scanned_at);

-- Una línea ocupa lugar si su orden está pagada o reservada y sin vencer.
create function order_is_active(p_status text, p_expires_at timestamptz) returns boolean
language sql stable
as $$ select p_status = 'paid' or (p_status = 'pending' and p_expires_at > now()) $$;

-- El precio que corresponde ahora: el primer lote vigente con cupo o, si no hay, el del sector.
create function current_price(p_sector_id uuid, out lot_id uuid, out price integer)
language plpgsql stable
as $$
begin
  select l.id, l.price into lot_id, price
  from price_lots l
  where l.sector_id = p_sector_id
    and (l.starts_at is null or l.starts_at <= now())
    and (l.ends_at is null or l.ends_at > now())
    and (
      l.quota is null
      or l.quota > (
        select count(*) from order_items i join orders o on o.id = i.order_id
        where i.lot_id = l.id and order_is_active(o.status, o.expires_at)
      )
    )
  order by l.position
  limit 1;

  if lot_id is null then
    select s.price into price from sectors s where s.id = p_sector_id;
  end if;
end;
$$;

-- Lugares libres de un sector general en una función.
create function general_remaining(p_performance_id uuid, p_sector_id uuid) returns integer
language sql stable
as $$
  select s.capacity - (
    select count(*)::int from order_items i join orders o on o.id = i.order_id
    where i.sector_id = s.id and o.performance_id = p_performance_id
      and order_is_active(o.status, o.expires_at)
  )
  from sectors s where s.id = p_sector_id
$$;

drop function hold_seats(uuid, uuid[], text, integer);

-- Reserva todo lo pedido o nada, y devuelve la orden creada. PA001: una butaca ya no está libre.
-- PA002: pedido vacío. PA003: no alcanzan los lugares de un sector general.
create function hold_order(
  p_performance_id uuid,
  p_seat_ids uuid[],
  p_general jsonb,          -- [{"sectorId": "...", "quantity": 2}]
  p_buyer_email text,
  p_buyer_name text,
  p_access_token text,
  p_client_ip text default null,
  p_minutes integer default 10
) returns uuid
language plpgsql
as $$
declare
  v_order_id uuid;
  v_until timestamptz := now() + make_interval(mins => p_minutes);
  v_event_id uuid;
  v_percent numeric(5, 2);
  v_wanted integer;
  v_held integer;
  v_total integer;
  v_price record;
  v_seat record;
  v_request record;
begin
  select count(distinct seat_id) into v_wanted from unnest(p_seat_ids) as seat_id;

  -- Solo se vende lo publicado y por venir.
  select events.id, organizations.commission_percent into v_event_id, v_percent
  from performances
  join events on events.id = performances.event_id
  join organizations on organizations.id = events.organization_id
  where performances.id = p_performance_id
    and performances.starts_at > now()
    and events.status = 'published'
    and organizations.suspended_at is null;

  if not found then
    raise exception 'la función no está a la venta' using errcode = 'PA001';
  end if;

  if v_wanted = 0 and coalesce(jsonb_array_length(p_general), 0) = 0 then
    raise exception 'no se pidió ninguna entrada' using errcode = 'PA002';
  end if;

  -- Los cupos de lotes y los sectores generales se cuentan: dos compras del mismo evento
  -- van en fila. Siempre en el mismo orden para que dos compras cruzadas no se traben.
  perform 1 from sectors where event_id = v_event_id order by id for update;

  perform 1 from seats
  where id = any (p_seat_ids) and performance_id = p_performance_id
  order by id
  for update;

  insert into orders (performance_id, buyer_email, buyer_name, access_token, client_ip, expires_at, commission_percent)
  values (p_performance_id, p_buyer_email, p_buyer_name, p_access_token, p_client_ip, v_until, v_percent)
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

  for v_seat in select id, sector_id from seats where order_id = v_order_id order by id loop
    select * into v_price from current_price(v_seat.sector_id);
    if v_price.price is null then
      raise exception 'el sector no tiene precio' using errcode = 'PA001';
    end if;
    insert into order_items (order_id, sector_id, seat_id, lot_id, unit_price)
    values (v_order_id, v_seat.sector_id, v_seat.id, v_price.lot_id, v_price.price);
  end loop;

  for v_request in
    select (item ->> 'sectorId')::uuid as sector_id, (item ->> 'quantity')::integer as quantity
    from jsonb_array_elements(coalesce(p_general, '[]')) as item
  loop
    perform 1 from sectors where id = v_request.sector_id and event_id = v_event_id and kind = 'general';
    if not found or v_request.quantity < 1 then
      raise exception 'sector no válido' using errcode = 'PA003';
    end if;
    if general_remaining(p_performance_id, v_request.sector_id) < v_request.quantity then
      raise exception 'no alcanzan los lugares' using errcode = 'PA003';
    end if;
    for i in 1..v_request.quantity loop
      select * into v_price from current_price(v_request.sector_id);
      if v_price.price is null then
        raise exception 'el sector no tiene precio' using errcode = 'PA003';
      end if;
      insert into order_items (order_id, sector_id, lot_id, unit_price)
      values (v_order_id, v_request.sector_id, v_price.lot_id, v_price.price);
    end loop;
  end loop;

  select sum(unit_price) into v_total from order_items where order_id = v_order_id;

  update orders
  set total = v_total,
      commission_amount = round(v_total * commission_percent / 100)
  where id = v_order_id;

  return v_order_id;
end;
$$;
