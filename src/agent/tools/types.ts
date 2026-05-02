/**
 * Tool types for the nutrition tracker agent
 */

/**
 * Nutrition data for a single food item
 */
export interface NutritionInfo {
  food: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  sugar: number; // grams
  confidence: number; // 0-1
  servingSize?: string;
  timestamp?: Date;
}

/**
 * Daily summary totals
 */
export interface DailySummary {
  userId: string;
  date: string; // YYYY-MM-DD
  meals: NutritionInfo[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
  };
  mealCount: number;
}

/**
 * User food log entry
 */
export interface FoodLogEntry {
  id: string;
  userId: string;
  nutrition: NutritionInfo;
  timestamp: Date;
  notes?: string;
}

/**
 * Tool response wrapper
 */
export interface ToolResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  executedAt: string;
}

/**
 * Analyze food request
 */
export interface AnalyzeFoodRequest {
  input: string;
  userPreferences?: {
    dietaryRestrictions?: string[];
    allergens?: string[];
  };
}

/**
 * Store configuration
 */
export interface StoreConfig {
  maxEntriesPerUser?: number;
  retentionDays?: number;
  enablePersistence?: boolean;
}
