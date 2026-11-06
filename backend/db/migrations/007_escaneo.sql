-- Escaneo en scan.palcotickets.com: quién puede escanear y de qué organizador es cada entrada de prueba.

-- Cada usuario de un cliente puede tener permiso para escanear, solo los QR de los eventos de su cliente.
-- Los admins de Nightowl (is_platform_admin) escanean los de todos los clientes, sin necesidad de esto.
alter table memberships add column can_scan boolean not null default false;
update memberships set can_scan = true where role in ('owner', 'portero');

-- Entrada de prueba de un cliente: solo la pueden escanear sus usuarios (y los admins).
-- Sin cliente, es una prueba general que solo escanean los admins.
alter table qr_test_tickets add column organization_id uuid references organizations (id) on delete cascade;
create index qr_test_tickets_organization_idx on qr_test_tickets (organization_id);
