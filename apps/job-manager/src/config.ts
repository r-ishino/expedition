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

  jobs: {
    /** 同時実行可能なジョブの最大数 */
    maxConcurrent: Number(process.env.MAX_CONCURRENT_JOBS ?? 3),

    /** ジョブのタイムアウト（ミリ秒）。デフォルト5分 */
    timeoutMs: Number(process.env.JOB_TIMEOUT_MS ?? 5 * 60 * 1000),
  },
} as const;
