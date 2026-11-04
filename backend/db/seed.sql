-- Función inventada para probar: misma sala que el plano de la landing (124 butacas).
-- Se puede correr varias veces sin duplicar nada.

insert into venues (id, slug, name, primary_color)
values ('00000000-0000-4000-8000-000000000001', 'teatro-demo', 'Teatro Demo', '#7A1428')
on conflict (id) do nothing;

insert into events (id, venue_id, title, starts_at)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Función de gala',
  '2026-11-14 21:00:00-03'
)
on conflict (id) do nothing;

insert into sectors (id, event_id, name, price)
values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'Platea', 22000),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Pullman', 16000)
on conflict (id) do nothing;

insert into seats (event_id, sector_id, row_label, number)
select
  '00000000-0000-4000-8000-000000000002',
  case when r.position <= 5
    then '00000000-0000-4000-8000-000000000003'::uuid
    else '00000000-0000-4000-8000-000000000004'::uuid
  end,
  r.label,
  n
from (
  values (1, 'A', 10), (2, 'B', 12), (3, 'C', 14), (4, 'D', 16),
         (5, 'E', 16), (6, 'F', 18), (7, 'G', 18), (8, 'H', 20)
) as r (position, label, seats)
cross join lateral generate_series(1, r.seats) as n
on conflict (event_id, row_label, number) do nothing;
