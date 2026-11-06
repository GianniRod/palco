export const MAX_SEATS_PER_ORDER = 8;

// Las butacas pedidas ya no están libres: el comprador tiene que elegir otras.
export class SeatsUnavailableError extends Error {
  constructor() {
    super("Butacas no disponibles");
    this.name = "SeatsUnavailableError";
  }
}

// Reserva todas las butacas o ninguna y devuelve el id de la orden.
export async function holdSeats(db, { performanceId, seatIds, buyerEmail }) {
  if (seatIds.length === 0 || seatIds.length > MAX_SEATS_PER_ORDER) {
    throw new RangeError(`Se pueden reservar de 1 a ${MAX_SEATS_PER_ORDER} butacas`);
  }

  try {
    const { rows } = await db.query("select hold_order($1, $2::uuid[], '[]'::jsonb, $3, '', null) as order_id", [
      performanceId,
      seatIds,
      buyerEmail,
    ]);
    return rows[0].order_id;
  } catch (error) {
    if (error.code === "PA001") {
      throw new SeatsUnavailableError();
    }
    throw error;
  }
}

// El plano del comprador: una reserva vencida ya se muestra como libre.
export async function listSeats(db, performanceId) {
  const { rows } = await db.query(
    `select
       seats.id,
       sectors.name as sector,
       sectors.price,
       seats.row_label as row,
       seats.number,
       (seats.status = 'free' or (seats.status = 'held' and seats.held_until < now())) as available
     from seats
     join sectors on sectors.id = seats.sector_id
     where seats.performance_id = $1
     order by seats.row_label, seats.number`,
    [performanceId],
  );
  return rows;
}
