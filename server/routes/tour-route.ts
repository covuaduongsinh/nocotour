import { defineApiRoutes } from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import { Hono } from 'hono';
import { createTourRoutes } from './tour.js';

export const tourApiRoutes = defineApiRoutes((app: any) => {
  let dbManager: any;
  try {
    dbManager = app.container.resolve(databaseManagerToken);
  } catch {
    dbManager = app.db;
  }
  const db = dbManager?.main || dbManager;
  const tourRouter = createTourRoutes(db);

  const router = new Hono();
  router.route('/tour', tourRouter);
  return router;
});
