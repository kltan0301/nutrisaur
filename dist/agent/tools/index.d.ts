/**
 * Tools module for the nutrition tracker agent
 * Exports all available tools for processing nutrition requests
 */
export { analyzeFood, getSupportedFoods, isFoodSupported, addCustomFood, } from './nutrition';
export { logFood, getSummary, clearAllLogs, clearUserLogs, getUserEntryCount, getAllUsers, getUserRawLog, updateStoreConfig, getStoreConfig, getStorageStats, } from './storage';
export type { NutritionInfo, DailySummary, FoodLogEntry, ToolResponse, AnalyzeFoodRequest, StoreConfig, } from './types';
/**
 * Tools namespace for easy access
 */
export declare const tools: {
    analyzeFood: (input: string) => Promise<import("./types").ToolResponse<import("./types").NutritionInfo>>;
    getSupportedFoods: () => Promise<string[]>;
    isFoodSupported: (food: string) => Promise<boolean>;
    logFood: (userId: string, nutrition: any) => Promise<import("./types").ToolResponse<import("./types").FoodLogEntry>>;
    getSummary: (userId: string, date?: string) => Promise<import("./types").ToolResponse<import("./types").DailySummary>>;
    clearAllLogs: () => Promise<void>;
    getUserStats: (userId: string) => Promise<{
        entries: number;
        rawLog: import("./types").FoodLogEntry[];
    }>;
};
//# sourceMappingURL=index.d.ts.map