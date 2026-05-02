/**
 * Nutrition analysis tool
 * Analyzes food input and returns mock nutrition data
 */
import { NutritionInfo, AnalyzeFoodRequest, ToolResponse } from './types';
/**
 * Analyze food input and return nutrition information
 *
 * @param request - Food analysis request
 * @returns Tool response with nutrition data or error
 *
 * @example
 * analyzeFood({ input: 'I ate a banana' })
 * // Returns: { success: true, data: { food: 'Banana', calories: 105, ... } }
 */
export declare function analyzeFood(request: AnalyzeFoodRequest | string): Promise<ToolResponse<NutritionInfo>>;
/**
 * Get list of supported foods
 */
export declare function getSupportedFoods(): string[];
/**
 * Check if a food is supported
 */
export declare function isFoodSupported(food: string): boolean;
/**
 * Add custom food to database (for testing/extension)
 */
export declare function addCustomFood(key: string, nutrition: NutritionInfo): void;
//# sourceMappingURL=nutrition.d.ts.map