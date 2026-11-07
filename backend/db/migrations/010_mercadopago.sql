-- Etapa 5b: cobro con Mercado Pago.
-- Un pago se puede confirmar dos veces (el webhook y la vuelta del comprador): el mail con
-- las entradas lo manda solo quien marca esta columna primero.
alter table orders add column tickets_emailed_at timestamptz;
