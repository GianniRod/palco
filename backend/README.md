# Backend de Palco

Base de datos y reserva de butacas. Es independiente de la landing: tiene sus propias dependencias y no entra en su build.

## Uso

Postgres en [Neon](https://neon.com). Copiá `.env.example` a `.env.local` y completá `DATABASE_URL`.

```bash
cd backend
npm install
npm run db:migrate   # aplica lo pendiente de db/migrations
npm run db:seed      # carga una función de prueba
```

## Pruebas

Necesitan un Postgres descartable en `TEST_DATABASE_URL`, nunca la base real:

```bash
npm test
```
