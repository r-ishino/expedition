export const config = {
  port: Number(process.env.PORT ?? 33333),

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3333',
  },

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 33336),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? 'expedition',
    database: process.env.DB_NAME ?? 'expedition',
  },
} as const;
