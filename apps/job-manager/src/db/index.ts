import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '~/config';
import {
  camps,
  challenges,
  checkpoints,
  dispatches,
  journals,
  quests,
  waypoints,
} from './schema';

const pool = mysql.createPool(config.db);

const schema = {
  camps,
  challenges,
  checkpoints,
  dispatches,
  journals,
  quests,
  waypoints,
};

export const db = drizzle(pool, { schema, mode: 'default' });
