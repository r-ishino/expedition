import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '~/config';
import {
  camps,
  challenges,
  checkpoints,
  dispatches,
  journals,
  questAttachments,
  questPlanningJobs,
  questPlanningMessages,
  questTerritories,
  quests,
  territories,
  waypointCategories,
  waypointDependencies,
  waypoints,
} from './schema';

export const pool = mysql.createPool(config.db);

const schema = {
  camps,
  challenges,
  checkpoints,
  dispatches,
  journals,
  questAttachments,
  questPlanningJobs,
  questPlanningMessages,
  questTerritories,
  quests,
  territories,
  waypointCategories,
  waypointDependencies,
  waypoints,
};

export const db = drizzle(pool, { schema, mode: 'default' });
