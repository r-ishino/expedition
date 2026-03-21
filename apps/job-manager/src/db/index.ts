import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "~/config";
import * as schema from "./schema";

const pool = mysql.createPool(config.db);

export const db = drizzle(pool, { schema, mode: "default" });
