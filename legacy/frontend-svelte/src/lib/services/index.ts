/**
 * Service Layer — Unified API for all platform modes.
 *
 * Automatically detects whether we're running in Tauri (desktop/mobile)
 * or in a standard Web browser (SSR), and routes calls accordingly.
 *
 * Usage:
 *   import { getAuthService, getDashboardService } from '$lib/services';
 *   const dashboard = getDashboardService();
 *   const data = await dashboard.getOverview();
 */
export { isTauri, isWeb, isServer } from './platform';
export { getAuthService, type AuthService } from './auth.service';
export { getDashboardService, type DashboardService, type DashboardOverview } from './dashboard.service';
export { getModelsService, type ModelsService } from './models.service';
export { getTrainingService, type TrainingService } from './training.service';
export { getRagService, type RagService } from './rag.service';
export { getTeamsService, type TeamsService } from './teams.service';
export { getServerStatusService, type ServerStatusService } from './server-status.service';
