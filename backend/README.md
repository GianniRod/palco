# Backend de Palco

Base de datos, reserva de butacas y la lógica del panel (login, clientes, auditoría). Tiene sus propias dependencias; el panel en `src/app/dashboard` importa `src/` directamente.

## Uso

Postgres en [Neon](https://neon.com). Copiá `.env.example` a `.env.local` y completá `DATABASE_URL`.

```bash
cd backend
npm install
npm run db:migrate   # aplica lo pendiente de db/migrations
npm run db:seed      # carga una función de prueba
npm run admin:create -- nombre@nightowl.com.ar   # crea un admin y muestra su contraseña inicial
```

## Pruebas

Necesitan un Postgres descartable en `TEST_DATABASE_URL`, nunca la base real:

```bash
npm test
```
