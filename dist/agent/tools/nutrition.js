"use strict";
/**
 * Nutrition analysis tool
 * Analyzes food input and returns mock nutrition data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFood = analyzeFood;
exports.getSupportedFoods = getSupportedFoods;
exports.isFoodSupported = isFoodSupported;
exports.addCustomFood = addCustomFood;
/**
 * Mock nutrition database for common foods
 * Each entry maps food patterns to nutrition info
 */
const NUTRITION_DATABASE = {
    banana: {
        food: 'Banana',
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.3,
        sugar: 14,
        confidence: 0.95,
        servingSize: '1 medium (118g)',
    },
    apple: {
        food: 'Apple',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        sugar: 19,
        confidence: 0.95,
        servingSize: '1 medium (182g)',
    },
    egg: {
        food: 'Egg',
        calories: 155,
        protein: 13,
        carbs: 1.1,
        fat: 11,
        sugar: 0.6,
        confidence: 0.95,
        servingSize: '1 large (50g)',
    },
    'chicken rice': {
        food: 'Chicken Rice',
        calories: 600,
        protein: 25,
        carbs: 80,
        fat: 20,
        sugar: 5,
        confidence: 0.8,
        servingSize: '1 plate (300g)',
    },
    pasta: {
        food: 'Pasta',
        calories: 371,
        protein: 13,
        carbs: 75,
        fat: 1.1,
        sugar: 2,
        confidence: 0.85,
        servingSize: '1 cup cooked (200g)',
    },
    salad: {
        food: 'Salad',
        calories: 150,
        protein: 5,
        carbs: 8,
        fat: 10,
        sugar: 3,
        confidence: 0.7,
        servingSize: '1 serving (300g)',
    },
    pizza: {
        food: 'Pizza',
        calories: 285,
        protein: 12,
        carbs: 36,
        fat: 10,
        sugar: 3,
        confidence: 0.75,
        servingSize: '1 slice (107g)',
    },
    sandwich: {
        food: 'Sandwich',
        calories: 350,
        protein: 15,
        carbs: 45,
        fat: 12,
        sugar: 5,
        confidence: 0.8,
        servingSize: '1 sandwich (200g)',
    },
    coffee: {
        food: 'Coffee',
        calories: 5,
        protein: 0.3,
        carbs: 0.7,
        fat: 0.1,
        sugar: 0,
        confidence: 0.9,
        servingSize: '1 cup (240ml)',
    },
    yogurt: {
        food: 'Yogurt',
        calories: 110,
        protein: 10,
        carbs: 12,
        fat: 0.5,
        sugar: 8,
        confidence: 0.9,
        servingSize: '1 cup (227g)',
    },
    milk: {
        food: 'Milk',
        calories: 150,
        protein: 8,
        carbs: 12,
        fat: 8,
        sugar: 12,
        confidence: 0.9,
        servingSize: '1 cup (244ml)',
    },
    bread: {
        food: 'Bread',
        calories: 265,
        protein: 9,
        carbs: 49,
        fat: 3,
        sugar: 4,
        confidence: 0.85,
        servingSize: '1 slice (28g)',
    },
};
/**
 * Find matching nutrition info by fuzzy matching food keywords
 */
function findNutritionMatch(input) {
    const lowerInput = input.toLowerCase().trim();
    // Exact match first
    if (NUTRITION_DATABASE[lowerInput]) {
        return { ...NUTRITION_DATABASE[lowerInput] };
    }
    // Partial match - find first keyword that appears in input
    for (const [key, nutrition] of Object.entries(NUTRITION_DATABASE)) {
        if (lowerInput.includes(key)) {
            return { ...nutrition };
        }
    }
    // Check for reverse matches (e.g., "rice chicken" instead of "chicken rice")
    const words = lowerInput.split(/\s+/);
    for (const word of words) {
        if (NUTRITION_DATABASE[word]) {
            return { ...NUTRITION_DATABASE[word] };
        }
    }
    return null;
}
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
async function analyzeFood(request) {
    try {
        const startTime = Date.now();
        // Accept either request object or plain string
        const input = typeof request === 'string' ? request : request.input;
        if (!input || input.trim().length === 0) {
            return {
                success: false,
                data: null,
                error: 'Input cannot be empty',
                executedAt: new Date().toISOString(),
            };
        }
        // Find matching nutrition
        const nutrition = findNutritionMatch(input);
        if (!nutrition) {
            return {
                success: false,
                data: null,
                error: `No nutrition data found for: "${input}". Try: banana, apple, egg, chicken rice, pasta, salad, pizza, sandwich, coffee, yogurt, milk, or bread.`,
                executedAt: new Date().toISOString(),
            };
        }
        // Add timestamp
        nutrition.timestamp = new Date();
        // Log execution
        const duration = Date.now() - startTime;
        console.log(`[${nutrition.timestamp.toISOString()}] 🍽️ analyzeFood: "${input}" → ${nutrition.food} (${duration}ms)`);
        return {
            success: true,
            data: nutrition,
            executedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ analyzeFood error: ${errorMsg}`);
        return {
            success: false,
            data: null,
            error: errorMsg,
            executedAt: new Date().toISOString(),
        };
    }
}
/**
 * Get list of supported foods
 */
function getSupportedFoods() {
    return Object.keys(NUTRITION_DATABASE);
}
/**
 * Check if a food is supported
 */
function isFoodSupported(food) {
    return food.toLowerCase() in NUTRITION_DATABASE;
}
/**
 * Add custom food to database (for testing/extension)
 */
function addCustomFood(key, nutrition) {
    NUTRITION_DATABASE[key.toLowerCase()] = nutrition;
    console.log(`✅ Added custom food: ${key}`);
}
//# sourceMappingURL=nutrition.js.map