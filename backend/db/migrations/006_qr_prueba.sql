-- Sistema de prueba de QR: entradas de prueba que genera un admin y el registro de cada escaneo.
-- Va aparte de tickets para no tocar la venta real; la firma del QR (src/qr.mjs) es la misma que
-- van a usar las entradas reales.

-- Par de claves Ed25519 con el que se firman los QR. Se crea solo la primera vez que se usa,
-- salvo que estén TICKET_SIGNING_PRIVATE_KEY y TICKET_SIGNING_PUBLIC_KEY en el entorno.
create table qr_signing_keys (
  id smallint primary key default 1 check (id = 1),
  private_key text not null, -- PKCS#8 DER en base64
  public_key text not null,  -- SPKI DER en base64 (la que va a usar la app de puerta sin internet)
  created_at timestamptz not null default now()
);

create table qr_test_tickets (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,            -- "Prueba 3"
  holder text not null default '',           -- nombre que se muestra al escanear
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Primer ingreso: se marca en un solo update condicionado, así dos escaneos a la vez no entran los dos.
  checked_in_at timestamptz,
  checked_in_by uuid references users (id) on delete set null
);

-- Cada escaneo queda registrado, también los repetidos y los inválidos.
create table qr_scans (
  id bigint generated always as identity primary key,
  ticket_id uuid references qr_test_tickets (id) on delete cascade,
  result text not null check (result in ('valid', 'duplicate', 'invalid')),
  scanned_by uuid references users (id) on delete set null,
  scanned_at timestamptz not null default now()
);

create index qr_scans_ticket_idx on qr_scans (ticket_id, scanned_at);
