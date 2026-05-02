/**
 * Storage tools for the nutrition tracker
 * Handles food logging and summary retrieval
 */
import { NutritionInfo, DailySummary, FoodLogEntry, ToolResponse, StoreConfig } from './types';
/**
 * Log a food entry for a user
 *
 * @param userId - User identifier
 * @param nutrition - Nutrition data to log
 * @returns Tool response with logged entry
 *
 * @example
 * logFood('user123', { food: 'Banana', calories: 105, ... })
 * // Returns: { success: true, data: { id: 'food_...', userId, nutrition, timestamp } }
 */
export declare function logFood(userId: string, nutrition: NutritionInfo): Promise<ToolResponse<FoodLogEntry>>;
/**
 * Get daily summary for a user
 *
 * @param userId - User identifier
 * @param date - Date to summarize (YYYY-MM-DD), defaults to today
 * @returns Tool response with daily summary
 *
 * @example
 * getSummary('user123')
 * // Returns: { success: true, data: { userId, date, meals: [...], totals: {...}, mealCount } }
 */
export declare function getSummary(userId: string, date?: string): Promise<ToolResponse<DailySummary>>;
/**
 * Clear all food logs (for testing)
 */
export declare function clearAllLogs(): void;
/**
 * Clear user's food logs (for testing)
 */
export declare function clearUserLogs(userId: string): void;
/**
 * Get total entries for a user
 */
export declare function getUserEntryCount(userId: string): number;
/**
 * Get all users with entries
 */
export declare function getAllUsers(): string[];
/**
 * Get raw food log for a user (admin only)
 */
export declare function getUserRawLog(userId: string): FoodLogEntry[];
/**
 * Update store configuration
 */
export declare function updateStoreConfig(config: Partial<StoreConfig>): void;
/**
 * Get store configuration
 */
export declare function getStoreConfig(): StoreConfig;
/**
 * Get storage statistics
 */
export declare function getStorageStats(): {
    totalUsers: number;
    totalEntries: number;
    entriesByUser: Record<string, number>;
};
//# sourceMappingURL=storage.d.ts.map