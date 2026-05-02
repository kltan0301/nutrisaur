"use strict";
/**
 * Storage tools for the nutrition tracker
 * Handles food logging and summary retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFood = logFood;
exports.getSummary = getSummary;
exports.clearAllLogs = clearAllLogs;
exports.clearUserLogs = clearUserLogs;
exports.getUserEntryCount = getUserEntryCount;
exports.getAllUsers = getAllUsers;
exports.getUserRawLog = getUserRawLog;
exports.updateStoreConfig = updateStoreConfig;
exports.getStoreConfig = getStoreConfig;
exports.getStorageStats = getStorageStats;
/**
 * In-memory food log storage
 * Structure: Map<userId, FoodLogEntry[]>
 */
const foodLog = new Map();
/**
 * Configuration for the store
 */
let storeConfig = {
    maxEntriesPerUser: 1000,
    retentionDays: 90,
    enablePersistence: false,
};
/**
 * Get or initialize user log
 */
function getUserLog(userId) {
    if (!foodLog.has(userId)) {
        foodLog.set(userId, []);
    }
    return foodLog.get(userId);
}
/**
 * Generate unique log entry ID
 */
function generateLogId() {
    return `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}
/**
 * Get date range start (midnight) for a given date
 */
function getDateStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
/**
 * Get date range end (just before midnight) for a given date
 */
function getDateEnd(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
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
async function logFood(userId, nutrition) {
    try {
        const startTime = Date.now();
        if (!userId || userId.trim().length === 0) {
            return {
                success: false,
                data: null,
                error: 'User ID cannot be empty',
                executedAt: new Date().toISOString(),
            };
        }
        if (!nutrition || !nutrition.food) {
            return {
                success: false,
                data: null,
                error: 'Nutrition data must include food name',
                executedAt: new Date().toISOString(),
            };
        }
        // Check max entries per user
        const userLog = getUserLog(userId);
        if (userLog.length >= (storeConfig.maxEntriesPerUser || 1000)) {
            return {
                success: false,
                data: null,
                error: `Maximum entries (${storeConfig.maxEntriesPerUser}) reached for user`,
                executedAt: new Date().toISOString(),
            };
        }
        // Create log entry
        const entry = {
            id: generateLogId(),
            userId,
            nutrition,
            timestamp: new Date(),
        };
        // Store it
        userLog.push(entry);
        const duration = Date.now() - startTime;
        console.log(`[${entry.timestamp.toISOString()}] ✅ logFood: user=${userId}, food=${nutrition.food} (${nutrition.calories} cal) (${duration}ms)`);
        return {
            success: true,
            data: entry,
            executedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ logFood error: ${errorMsg}`);
        return {
            success: false,
            data: null,
            error: errorMsg,
            executedAt: new Date().toISOString(),
        };
    }
}
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
async function getSummary(userId, date) {
    try {
        const startTime = Date.now();
        if (!userId || userId.trim().length === 0) {
            return {
                success: false,
                data: null,
                error: 'User ID cannot be empty',
                executedAt: new Date().toISOString(),
            };
        }
        const targetDate = date || getTodayDate();
        // Get user's log
        const userLog = getUserLog(userId);
        // Filter entries for the target date
        const dateStart = getDateStart(targetDate);
        const dateEnd = getDateEnd(targetDate);
        const mealsForDate = userLog
            .filter((entry) => entry.timestamp >= dateStart && entry.timestamp <= dateEnd)
            .map((entry) => entry.nutrition);
        // Calculate totals
        const totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            sugar: 0,
        };
        mealsForDate.forEach((meal) => {
            totals.calories += meal.calories;
            totals.protein += meal.protein;
            totals.carbs += meal.carbs;
            totals.fat += meal.fat;
            totals.sugar += meal.sugar;
        });
        const summary = {
            userId,
            date: targetDate,
            meals: mealsForDate,
            totals,
            mealCount: mealsForDate.length,
        };
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] 📊 getSummary: user=${userId}, date=${targetDate}, meals=${summary.mealCount} (${duration}ms)`);
        return {
            success: true,
            data: summary,
            executedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ getSummary error: ${errorMsg}`);
        return {
            success: false,
            data: null,
            error: errorMsg,
            executedAt: new Date().toISOString(),
        };
    }
}
/**
 * Clear all food logs (for testing)
 */
function clearAllLogs() {
    foodLog.clear();
    console.log('🗑️ Cleared all food logs');
}
/**
 * Clear user's food logs (for testing)
 */
function clearUserLogs(userId) {
    foodLog.delete(userId);
    console.log(`🗑️ Cleared logs for user: ${userId}`);
}
/**
 * Get total entries for a user
 */
function getUserEntryCount(userId) {
    return getUserLog(userId).length;
}
/**
 * Get all users with entries
 */
function getAllUsers() {
    return Array.from(foodLog.keys());
}
/**
 * Get raw food log for a user (admin only)
 */
function getUserRawLog(userId) {
    return [...getUserLog(userId)];
}
/**
 * Update store configuration
 */
function updateStoreConfig(config) {
    storeConfig = { ...storeConfig, ...config };
    console.log('⚙️ Store config updated:', storeConfig);
}
/**
 * Get store configuration
 */
function getStoreConfig() {
    return { ...storeConfig };
}
/**
 * Get storage statistics
 */
function getStorageStats() {
    const entriesByUser = {};
    let totalEntries = 0;
    for (const [userId, entries] of foodLog.entries()) {
        entriesByUser[userId] = entries.length;
        totalEntries += entries.length;
    }
    return {
        totalUsers: foodLog.size,
        totalEntries,
        entriesByUser,
    };
}
//# sourceMappingURL=storage.js.map