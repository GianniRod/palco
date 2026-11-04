// Aplica las migraciones pendientes de db/migrations y, con "seed", carga la función de prueba.
// Usa DATABASE_URL (en .env.local o en el entorno).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const root = join(import.meta.dirname, "..", "db");
const migrationsDir = join(root, "migrations");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const { rowCount } = await client.query("select 1 from schema_migrations where name = $1", [file]);
    if (rowCount) continue;

    await client.query("begin");
    try {
      await client.query(await readFile(join(migrationsDir, file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`Migración aplicada: ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  if (process.argv[2] === "seed") {
    await client.query(await readFile(join(root, "seed.sql"), "utf8"));
    console.log("Función de prueba cargada");
  }
} finally {
  await client.end();
}
