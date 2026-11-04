// Crea un admin de Palco y muestra su contraseña inicial una sola vez.
// El panel no permite crear admins: el primero (y los siguientes) salen de acá.
// Uso: npm run admin:create -- nombre@palcotickets.com
import pg from "pg";
import { generateTemporaryPassword, hashPassword, normalizeEmail, recordAudit } from "../src/auth.mjs";

const email = normalizeEmail(process.argv[2]);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: npm run admin:create -- nombre@palcotickets.com");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const password = generateTemporaryPassword();
  const { rows: [user] } = await client.query(
    `insert into users (email, password_hash, is_platform_admin)
     values ($1, $2, true)
     on conflict (email) do nothing
     returning id`,
    [email, await hashPassword(password)],
  );
  if (!user) {
    console.error(`Ya existe un usuario con el email ${email}`);
    process.exitCode = 1;
  } else {
    await recordAudit(client, { actorUserId: user.id, actorEmail: email, action: "admin.created" });
    console.log(`Admin creado: ${email}`);
    console.log(`Contraseña inicial (hay que cambiarla al entrar): ${password}`);
  }
} finally {
  await client.end();
}
