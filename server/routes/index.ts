import type { Application } from '@nocobase/app-server/application';
import type { AppRouteContribution } from '@nocobase/app-server/router';
import { crmRoutes } from './crm.js';
import { whatsappWebhookRoutes } from './whatsapp.js';
import { tourApiRoutes } from './tour-route.js';

const routes: readonly AppRouteContribution<Application>[] = [
  tourApiRoutes,
  crmRoutes,
  whatsappWebhookRoutes,
];

export default routes;
