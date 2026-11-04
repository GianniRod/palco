import pg from "pg";

// Una sola conexión compartida para todo el proceso.
let pool;

export function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta DATABASE_URL");
    }
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
}
