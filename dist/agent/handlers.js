"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGoal = handleGoal;
exports.handleLog = handleLog;
exports.handleAnalyze = handleAnalyze;
exports.handleSummary = handleSummary;
exports.handleRecommend = handleRecommend;
exports.handleHelp = handleHelp;
exports.getUserRecord = getUserRecord;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const logger_1 = require("../middleware/logger");
const db_1 = require("./db");
const types_1 = require("./types");
const goalLabels = {
    lose_weight: 'Lose weight',
    maintain_weight: 'Maintain weight',
    gain_weight: 'Gain weight',
};
const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
};
const activityLabels = {
    sedentary: 'Sedentary',
    lightly_active: 'Lightly active',
    moderately_active: 'Moderately active',
    very_active: 'Very active',
};
function cleanCommand(input, command) {
    return input.replace(new RegExp(`^/${command}(?:@\\w+)?\\s*`, 'i'), '').trim();
}
function jsonFromText(text) {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    return JSON.parse(cleaned);
}
function normalizeNutrition(raw, fallbackFood) {
    return {
        food: String(raw.food || fallbackFood).trim(),
        calories: Math.max(0, Math.round(Number(raw.calories) || 0)),
        protein: Math.max(0, Number(raw.protein) || 0),
        carbs: Math.max(0, Number(raw.carbs) || 0),
        fat: Math.max(0, Number(raw.fat) || 0),
        sugar: Math.max(0, Number(raw.sugar) || 0),
        confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0.65)),
    };
}
function normalizeMealText(input) {
    return input
        .toLowerCase()
        .replace(/^\/(?:log|analyse|analyze)(?:@\w+)?\s*/i, '')
        .replace(/\b(i have eaten|today i ate|i just ate|just ate|i ate|i had|today i had|had|ate|consumed)\b/gi, ' ')
        .replace(/[^\p{L}\p{N}./%+-]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function nutritionCacheKey(description, image) {
    if (image) {
        const hash = crypto_1.default.createHash('sha256').update(image.mimeType).update(':').update(image.data).digest('hex');
        const caption = normalizeMealText(description);
        return {
            key: `image:${hash}:${caption}`,
            normalizedInput: caption || 'photo',
            source: 'image',
        };
    }
    const normalizedInput = normalizeMealText(description);
    return {
        key: `text:${normalizedInput}`,
        normalizedInput,
        source: 'text',
    };
}
async function callGemini(parts, systemInstruction) {
    if (!config_1.config.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }
    const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${config_1.config.geminiModel}:generateContent`, {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        contents: [{ role: 'user', parts }],
        generationConfig: {
            temperature: 0.25,
        },
    }, {
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config_1.config.geminiApiKey,
        },
        timeout: 15000,
    });
    const text = response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n');
    if (!text)
        throw new Error('Gemini returned an empty response');
    return text;
}
async function estimateNutrition(description, image) {
    const cache = nutritionCacheKey(description, image);
    if (cache.normalizedInput) {
        const cached = await db_1.nutritionStore.getCachedNutrition(cache.key);
        if (cached) {
            console.log(`[${new Date().toISOString()}] Nutrition cache hit: ${cache.key}`);
            return cached.nutrition;
        }
    }
    const prompt = `Estimate the nutrition for this meal. If the text contains phrases like "I ate" or "today I ate", extract only the food. Return only JSON with keys: food, calories, protein, carbs, fat, sugar, confidence. Use grams for macros and one realistic Singapore serving unless quantity is specified. Input: ${description || 'image meal'}`;
    const parts = [{ text: prompt }];
    if (image) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
    const text = await callGemini(parts, 'You are Nutrisaur, a practical nutrition estimator. Be realistic, concise, and return valid JSON only.');
    const nutrition = normalizeNutrition(jsonFromText(text), description || 'meal photo');
    if (cache.normalizedInput) {
        await db_1.nutritionStore.setCachedNutrition(cache.key, cache.source, cache.normalizedInput, nutrition);
    }
    return nutrition;
}
function userKey(request) {
    return String(request.userId || request.chatId || 'local');
}
function mealId() {
    return `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function emptyTotals() {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };
}
function addTotals(totals, nutrition) {
    totals.calories += nutrition.calories;
    totals.protein += nutrition.protein;
    totals.carbs += nutrition.carbs;
    totals.fat += nutrition.fat;
    totals.sugar += nutrition.sugar;
}
function roundTotals(totals) {
    return {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        sugar: Math.round(totals.sugar * 10) / 10,
    };
}
function parseSummaryPeriod(input) {
    const lower = input.toLowerCase();
    if (lower.includes('month') || lower.includes('30'))
        return 'month';
    if (lower.includes('week') || lower.includes('7'))
        return 'week';
    return 'day';
}
function getDateRange(period) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    const dayCount = period === 'month' ? 30 : period === 'week' ? 7 : 1;
    startDate.setDate(startDate.getDate() - (dayCount - 1));
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate, dayCount };
}
function parseGoalChoice(input) {
    const lower = input.toLowerCase();
    if (lower === '1' || lower.includes('lose'))
        return 'lose_weight';
    if (lower === '2' || lower.includes('maintain'))
        return 'maintain_weight';
    if (lower === '3' || lower.includes('gain'))
        return 'gain_weight';
    return null;
}
function parseGender(input) {
    const lower = input.toLowerCase();
    if (lower === 'm' || lower.includes('male'))
        return 'male';
    if (lower === 'f' || lower.includes('female'))
        return 'female';
    return null;
}
function parseActivity(input) {
    const lower = input.toLowerCase();
    if (lower === '1' || lower.includes('sedentary'))
        return 'sedentary';
    if (lower === '2' || lower.includes('light'))
        return 'lightly_active';
    if (lower === '3' || lower.includes('moderate'))
        return 'moderately_active';
    if (lower === '4' || lower.includes('very') || lower.includes('daily'))
        return 'very_active';
    return null;
}
function parseBody(input) {
    const numbers = input.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
    if (numbers.length < 3)
        return null;
    const [age, heightCm, weightKg] = numbers;
    if (age < 10 || age > 100 || heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 250)
        return null;
    return { age, heightCm, weightKg };
}
function calculateGoal(draft) {
    const data = draft.data;
    const goal = data.goal;
    const gender = data.gender;
    const activityLevel = data.activityLevel;
    const age = Number(data.age);
    const heightCm = Number(data.heightCm);
    const weightKg = Number(data.weightKg);
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
    const maintenanceCalories = bmr * activityMultipliers[activityLevel];
    const goalAdjustment = goal === 'lose_weight' ? -450 : goal === 'gain_weight' ? 300 : 0;
    const dailyCalories = Math.max(1200, Math.round(maintenanceCalories + goalAdjustment));
    const proteinTarget = Math.round(weightKg * (goal === 'lose_weight' ? 2 : 1.6));
    return {
        goal,
        gender,
        activityLevel,
        age,
        heightCm,
        weightKg,
        bmr: Math.round(bmr),
        maintenanceCalories: Math.round(maintenanceCalories),
        dailyCalories,
        proteinTarget,
        updatedAt: new Date().toISOString(),
    };
}
function goalQuestion(step) {
    if (step === 'goal')
        return 'What is your goal?\n1. Lose weight\n2. Maintain weight\n3. Gain weight';
    if (step === 'gender')
        return 'Gender?\nMale or Female';
    if (step === 'activity')
        return 'Activity level?\n1. Sedentary\n2. Lightly active\n3. Moderately active\n4. Very active';
    return 'Age, height, and weight?\nReply like: 32 175 72';
}
function goalReplyMarkup(step) {
    if (step === 'goal') {
        return {
            keyboard: [[{ text: 'Lose weight' }], [{ text: 'Maintain weight' }], [{ text: 'Gain weight' }]],
            one_time_keyboard: true,
            resize_keyboard: true,
        };
    }
    if (step === 'gender') {
        return {
            keyboard: [[{ text: 'Male' }, { text: 'Female' }]],
            one_time_keyboard: true,
            resize_keyboard: true,
        };
    }
    if (step === 'activity') {
        return {
            keyboard: [[{ text: 'Sedentary' }], [{ text: 'Lightly active' }], [{ text: 'Moderately active' }], [{ text: 'Very active' }]],
            one_time_keyboard: true,
            resize_keyboard: true,
        };
    }
    return { force_reply: true, input_field_placeholder: '32 175 72' };
}
function formatGoal(goal) {
    return `Goal saved: ${goalLabels[goal.goal]}\nDaily target: ${goal.dailyCalories} cal\nProtein target: ${goal.proteinTarget}g\nMaintenance estimate: ${goal.maintenanceCalories} cal\nProfile: ${goal.gender}, ${goal.age}y, ${goal.heightCm}cm, ${goal.weightKg}kg, ${activityLabels[goal.activityLevel]}\n\nYou can run /goal again anytime to edit it.`;
}
async function handleGoal(request) {
    const userId = userKey(request);
    const input = cleanCommand(request.userInput, 'goal');
    const user = await db_1.nutritionStore.getUser(userId, request.chatId);
    if (!user.goalDraft || request.userInput.toLowerCase().startsWith('/goal')) {
        if (!input) {
            await db_1.nutritionStore.setGoalDraft(userId, { step: 'goal', data: {} }, request.chatId);
            return response(types_1.Intent.GOAL, true, null, goalQuestion('goal'), undefined, goalReplyMarkup('goal'));
        }
    }
    const draft = user.goalDraft || { step: 'goal', data: {} };
    let nextStep = null;
    let errorMessage = null;
    if (draft.step === 'goal') {
        const goal = parseGoalChoice(input || request.userInput);
        if (goal) {
            draft.data.goal = goal;
            nextStep = 'gender';
        }
        else {
            errorMessage = goalQuestion('goal');
        }
    }
    else if (draft.step === 'gender') {
        const gender = parseGender(request.userInput);
        if (gender) {
            draft.data.gender = gender;
            nextStep = 'activity';
        }
        else {
            errorMessage = goalQuestion('gender');
        }
    }
    else if (draft.step === 'activity') {
        const activityLevel = parseActivity(request.userInput);
        if (activityLevel) {
            draft.data.activityLevel = activityLevel;
            nextStep = 'body';
        }
        else {
            errorMessage = goalQuestion('activity');
        }
    }
    else {
        const body = parseBody(request.userInput);
        if (body) {
            Object.assign(draft.data, body);
            const goal = calculateGoal(draft);
            await db_1.nutritionStore.setGoal(userId, goal, request.chatId);
            return response(types_1.Intent.GOAL, true, goal, formatGoal(goal), undefined, { remove_keyboard: true });
        }
        errorMessage = goalQuestion('body');
    }
    if (errorMessage) {
        await db_1.nutritionStore.setGoalDraft(userId, draft, request.chatId);
        return response(types_1.Intent.GOAL, false, null, errorMessage, 'Invalid goal response', goalReplyMarkup(draft.step));
    }
    draft.step = nextStep;
    await db_1.nutritionStore.setGoalDraft(userId, draft, request.chatId);
    return response(types_1.Intent.GOAL, true, null, goalQuestion(draft.step), undefined, goalReplyMarkup(draft.step));
}
async function handleLog(request, image) {
    try {
        const text = cleanCommand(request.userInput, 'log') || request.userInput;
        const nutrition = await estimateNutrition(text, image);
        const meal = {
            id: mealId(),
            userId: userKey(request),
            chatId: request.chatId,
            source: image ? 'image' : 'text',
            rawInput: text || 'photo',
            nutrition,
            timestamp: new Date().toISOString(),
        };
        await db_1.nutritionStore.addMeal(meal.userId, meal, request.chatId);
        return response(types_1.Intent.LOG, true, meal, `Logged: ${nutrition.food}\n${nutrition.calories} cal | P ${nutrition.protein}g | C ${nutrition.carbs}g | F ${nutrition.fat}g | Sugar ${nutrition.sugar}g\nConfidence: ${Math.round(nutrition.confidence * 100)}%`);
    }
    catch (error) {
        return failure(types_1.Intent.LOG, error, 'I could not log that meal. Check GEMINI_API_KEY or try a clearer description.');
    }
}
async function handleAnalyze(request, image) {
    try {
        const text = cleanCommand(request.userInput, 'analyse') || cleanCommand(request.userInput, 'analyze') || request.userInput;
        const nutrition = await estimateNutrition(text, image);
        return response(types_1.Intent.ANALYZE, true, nutrition, `Analysis: ${nutrition.food}\n${nutrition.calories} cal | P ${nutrition.protein}g | C ${nutrition.carbs}g | F ${nutrition.fat}g | Sugar ${nutrition.sugar}g\nConfidence: ${Math.round(nutrition.confidence * 100)}%`);
    }
    catch (error) {
        return failure(types_1.Intent.ANALYZE, error, 'I could not analyse that meal. Try adding portion size or a clearer photo.');
    }
}
async function handleSummary(request) {
    const userId = userKey(request);
    const user = await db_1.nutritionStore.getUser(userId, request.chatId);
    const period = parseSummaryPeriod(request.userInput);
    const { startDate, endDate, dayCount } = getDateRange(period);
    const meals = await db_1.nutritionStore.getMealsByDateRange(userId, startDate, endDate);
    const totals = emptyTotals();
    meals.forEach((meal) => addTotals(totals, meal.nutrition));
    const roundedTotals = roundTotals(totals);
    const averagePerDay = roundTotals({
        calories: totals.calories / dayCount,
        protein: totals.protein / dayCount,
        carbs: totals.carbs / dayCount,
        fat: totals.fat / dayCount,
        sugar: totals.sugar / dayCount,
    });
    const remainingCalories = period === 'day' && user.goal ? user.goal.dailyCalories - roundedTotals.calories : undefined;
    const mealLines = meals.slice(-10).map((meal) => `- ${meal.nutrition.food}: ${meal.nutrition.calories} cal`).join('\n');
    const targetLine = user.goal && period === 'day' ? `\nRemaining today: ${remainingCalories} cal from ${user.goal.dailyCalories} cal target` : '';
    const message = `Summary for ${period}\nMeals: ${meals.length}\nTotal: ${roundedTotals.calories} cal | P ${roundedTotals.protein}g | C ${roundedTotals.carbs}g | F ${roundedTotals.fat}g | Sugar ${roundedTotals.sugar}g\nAverage/day: ${averagePerDay.calories} cal | P ${averagePerDay.protein}g${targetLine}${mealLines ? `\n\nRecent meals:\n${mealLines}` : ''}`;
    return response(types_1.Intent.SUMMARY, true, {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totals: roundedTotals,
        averagePerDay,
        remainingCalories,
        meals,
    }, message);
}
async function handleRecommend(request) {
    try {
        const userId = userKey(request);
        const user = await db_1.nutritionStore.getUser(userId, request.chatId);
        const place = cleanCommand(request.userInput, 'recommend') || 'hawker';
        const today = await handleSummary({ ...request, userInput: '/summary by day' });
        const remainingCalories = today.data?.remainingCalories ?? user.goal?.dailyCalories;
        const goalContext = user.goal ? `${goalLabels[user.goal.goal]}, ${user.goal.dailyCalories} daily calories, ${user.goal.proteinTarget}g protein target` : 'No saved goal yet';
        const ntucRule = place.toLowerCase().includes('home') ? 'For home, recommend only ingredients commonly available at NTUC Singapore and minimal-effort meals.' : '';
        const prompt = `Recommend food for place/context: ${place}. User goal: ${goalContext}. Remaining calories today: ${remainingCalories ?? 'unknown'}. Prefer fat loss while preserving muscle: high protein, sensible calories, not too sugary. ${ntucRule} Return a short practical Telegram-ready answer with 3 options and estimated calories/protein.`;
        const recommendation = await callGemini([{ text: prompt }], 'You are Nutrisaur, a Singapore-aware nutrition coach. Be practical, specific, and concise.');
        return response(types_1.Intent.RECOMMEND, true, { place, recommendation }, recommendation);
    }
    catch (error) {
        return failure(types_1.Intent.RECOMMEND, error, 'I could not create recommendations right now. Check GEMINI_API_KEY and try again.');
    }
}
async function handleHelp() {
    return response(types_1.Intent.HELP, true, null, `Nutrisaur commands\n/goal - set or edit your calorie goal\n/log chicken rice - analyse and save a meal\n/analyse chicken rice - analyse without saving\n/summary by day|week|month - totals and averages\n/recommend hawker|home|restaurant - food ideas based on your goal\n\nYou can also type "I ate chicken rice" or send a food photo with /log or /analyse.`);
}
function response(intent, success, data, message, error, replyMarkup) {
    return {
        intent,
        success,
        data,
        message,
        timestamp: new Date().toISOString(),
        replyMarkup,
        error,
    };
}
function failure(intent, error, message) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    (0, logger_1.logError)(new Error(errorMsg), intent);
    return response(intent, false, null, message, errorMsg);
}
async function getUserRecord(request) {
    return db_1.nutritionStore.getUser(userKey(request), request.chatId);
}
//# sourceMappingURL=handlers.js.map