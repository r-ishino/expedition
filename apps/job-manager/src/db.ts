import mysql from "mysql2/promise";
import { config } from "./config";

export const pool: mysql.Pool = mysql.createPool(config.db);
