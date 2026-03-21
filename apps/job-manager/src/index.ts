import { serve } from "@hono/node-server";
import { Hono } from "hono";
import mysql from "mysql2/promise";
import type { HealthStatus } from "@expedition/shared";

const app: Hono = new Hono();

const pool: mysql.Pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 33336),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "expedition",
  database: process.env.DB_NAME ?? "expedition",
});

app.get("/health", async (c) => {
  try {
    await pool.query("SELECT 1");
    const response: HealthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "job-manager",
    };
    return c.json(response);
  } catch {
    const response: HealthStatus = {
      status: "error",
      timestamp: new Date().toISOString(),
      service: "job-manager",
    };
    return c.json(response, 503);
  }
});

serve({ fetch: app.fetch, port: 33333 }, (info) => {
  console.log(`job-manager listening on http://localhost:${info.port}`);
});
