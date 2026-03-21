import { Hono } from "hono";
import { pool } from "../db";
import type { HealthStatus } from "@expedition/shared";

const app = new Hono();

app.get("/", async (c) => {
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

export { app };
