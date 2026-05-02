/**
 * Tools module for the nutrition tracker agent
 * Exports all available tools for processing nutrition requests
 */

export {
  analyzeFood,
  getSupportedFoods,
  isFoodSupported,
  addCustomFood,
} from './nutrition';

export {
  logFood,
  getSummary,
  clearAllLogs,
  clearUserLogs,
  getUserEntryCount,
  getAllUsers,
  getUserRawLog,
  updateStoreConfig,
  getStoreConfig,
  getStorageStats,
} from './storage';

export type {
  NutritionInfo,
  DailySummary,
  FoodLogEntry,
  ToolResponse,
  AnalyzeFoodRequest,
  StoreConfig,
} from './types';

/**
 * Tools namespace for easy access
 */
export const tools = {
  // Nutrition analysis
  analyzeFood: (input: string) => import('./nutrition').then((m) => m.analyzeFood(input)),
  getSupportedFoods: () => import('./nutrition').then((m) => m.getSupportedFoods()),
  isFoodSupported: (food: string) => import('./nutrition').then((m) => m.isFoodSupported(food)),

  // Storage
  logFood: (userId: string, nutrition: any) => import('./storage').then((m) => m.logFood(userId, nutrition)),
  getSummary: (userId: string, date?: string) => import('./storage').then((m) => m.getSummary(userId, date)),
  clearAllLogs: () => import('./storage').then((m) => m.clearAllLogs()),
  getUserStats: (userId: string) => import('./storage').then((m) => ({
    entries: m.getUserEntryCount(userId),
    rawLog: m.getUserRawLog(userId),
  })),
};
