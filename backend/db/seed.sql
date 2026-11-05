-- Función inventada para probar: misma sala que el plano de la landing (124 butacas).
-- Se puede correr varias veces sin duplicar nada.

insert into organizations (id, slug, name, commission_percent)
values ('00000000-0000-4000-8000-000000000005', 'cliente-demo', 'Cliente Demo', 5)
on conflict (id) do nothing;

insert into venues (id, organization_id, name, map)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000005',
  'Teatro Demo',
  '{"sectors": [
    {"key": "escenario", "kind": "stage", "name": "Escenario", "x": 25, "y": 2, "w": 50, "h": 12},
    {"key": "platea", "kind": "numbered", "name": "Platea", "x": 12, "y": 20, "w": 76, "h": 42, "rows": [10, 12, 14, 16, 16], "aisles": []},
    {"key": "pullman", "kind": "numbered", "name": "Pullman", "x": 8, "y": 68, "w": 84, "h": 28, "rows": [18, 18, 20], "aisles": []}
  ]}'
)
on conflict (id) do nothing;

insert into events (id, organization_id, venue_id, title, status, map)
select
  '00000000-0000-4000-8000-000000000002',
  venues.organization_id,
  venues.id,
  'Función de gala',
  'published',
  venues.map
from venues
where venues.id = '00000000-0000-4000-8000-000000000001'
on conflict (id) do nothing;

insert into performances (id, event_id, starts_at)
values (
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000002',
  now() + interval '30 days'
)
on conflict (id) do nothing;

insert into sectors (id, event_id, map_key, name, price, position)
values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'platea', 'Platea', 22000, 0),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'pullman', 'Pullman', 16000, 1)
on conflict (id) do nothing;

insert into seats (performance_id, sector_id, row_label, number)
select
  '00000000-0000-4000-8000-000000000006',
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
on conflict (performance_id, sector_id, row_label, number) do nothing;
