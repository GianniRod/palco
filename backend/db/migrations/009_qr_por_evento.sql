-- Cada entrada de prueba es de un evento puntual: un QR de un evento no sirve para otro.
-- Sin evento = prueba general, que solo validan los admins de Nightowl.
alter table qr_test_tickets add column event_id uuid references events (id) on delete cascade;
create index qr_test_tickets_event_idx on qr_test_tickets (event_id);
