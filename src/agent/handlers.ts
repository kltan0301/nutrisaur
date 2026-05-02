import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { logError } from '../middleware/logger';
import { nutritionStore } from './db';
import {
  ActivityLevel,
  AgentRequest,
  AgentResponse,
  Gender,
  GoalDraft,
  GoalFlowStep,
  GoalType,
  Intent,
  LogsData,
  Meal,
  NutritionData,
  RecommendationData,
  SummaryData,
  SummaryPeriod,
  SummaryTotals,
  UserGoal,
  UserRecord,
} from './types';

const goalLabels: Record<GoalType, string> = {
  lose_weight: 'Lose weight',
  maintain_weight: 'Maintain weight',
  gain_weight: 'Gain weight',
};

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
};

function cleanCommand(input: string, command: string): string {
  return input.replace(new RegExp(`^/${command}(?:@\\w+)?\\s*`, 'i'), '').trim();
}

function jsonFromText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(cleaned);
}

function normalizeNutrition(raw: any, fallbackFood: string): NutritionData {
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

function normalizeMealText(input: string): string {
  return input
    .toLowerCase()
    .replace(/^\/(?:log|analyse|analyze)(?:@\w+)?\s*/i, '')
    .replace(/\b(i have eaten|today i ate|i just ate|just ate|i ate|i had|today i had|had|ate|consumed)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}./%+-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nutritionCacheKey(description: string, image?: { data: string; mimeType: string }): { key: string; normalizedInput: string; source: 'text' | 'image' } {
  if (image) {
    const hash = crypto.createHash('sha256').update(image.mimeType).update(':').update(image.data).digest('hex');
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

async function callGemini(parts: Array<Record<string, unknown>>, systemInstruction?: string): Promise<string> {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.25,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiApiKey,
      },
      timeout: 15000,
    }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join('\n');
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

async function estimateNutrition(description: string, image?: { data: string; mimeType: string }): Promise<NutritionData> {
  const cache = nutritionCacheKey(description, image);
  if (cache.normalizedInput) {
    const cached = await nutritionStore.getCachedNutrition(cache.key);
    if (cached) {
      console.log(`[${new Date().toISOString()}] Nutrition cache hit: ${cache.key}`);
      return cached.nutrition;
    }
  }

  const prompt = `Estimate the nutrition for this meal. If the text contains phrases like "I ate" or "today I ate", extract only the food. Return only JSON with keys: food, calories, protein, carbs, fat, sugar, confidence. Use grams for macros and one realistic Singapore serving unless quantity is specified. Input: ${description || 'image meal'}`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  const text = await callGemini(parts, 'You are Nutrisaur, a practical nutrition estimator. Be realistic, concise, and return valid JSON only.');
  const nutrition = normalizeNutrition(jsonFromText(text), description || 'meal photo');
  if (cache.normalizedInput) {
    await nutritionStore.setCachedNutrition(cache.key, cache.source, cache.normalizedInput, nutrition);
  }
  return nutrition;
}

function userKey(request: AgentRequest): string {
  return String(request.userId || request.chatId || 'local');
}

function mealId(): string {
  return `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTotals(): SummaryTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };
}

function addTotals(totals: SummaryTotals, nutrition: NutritionData): void {
  totals.calories += nutrition.calories;
  totals.protein += nutrition.protein;
  totals.carbs += nutrition.carbs;
  totals.fat += nutrition.fat;
  totals.sugar += nutrition.sugar;
}

function roundTotals(totals: SummaryTotals): SummaryTotals {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    sugar: Math.round(totals.sugar * 10) / 10,
  };
}

function parseSummaryPeriod(input: string): SummaryPeriod {
  const lower = input.toLowerCase();
  if (lower.includes('month') || lower.includes('30')) return 'month';
  if (lower.includes('week') || lower.includes('7')) return 'week';
  return 'day';
}

function getDateRange(period: SummaryPeriod): { startDate: Date; endDate: Date; dayCount: number } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  const dayCount = period === 'month' ? 30 : period === 'week' ? 7 : 1;
  startDate.setDate(startDate.getDate() - (dayCount - 1));
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate, dayCount };
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

function parseSpecificDate(input: string): Date | null {
  const iso = input.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const [, year, month, day] = iso;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slash = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const [, day, month, year] = slash;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseWeekday(input: string): { date: Date; label: string } | null {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const lower = input.toLowerCase();
  const weekdayIndex = weekdays.findIndex((day) => lower.includes(day));
  if (weekdayIndex < 0) return null;

  const today = startOfDay(new Date());
  const currentDay = today.getDay();
  let diff = currentDay - weekdayIndex;
  if (lower.includes('last') || diff <= 0) diff += 7;

  const date = new Date(today);
  date.setDate(today.getDate() - diff);
  return { date, label: lower.includes('last') ? `last ${weekdays[weekdayIndex]}` : weekdays[weekdayIndex] };
}

function parseLogsRange(userInput: string): { label: string; startDate: Date; endDate: Date } {
  const input = cleanCommand(userInput, 'logs').toLowerCase() || 'today';
  const now = new Date();

  if (input.includes('this week')) {
    const startDate = startOfWeek(now);
    return { label: 'this week', startDate, endDate: endOfDay(now) };
  }

  if (input.includes('last week')) {
    const endDate = new Date(startOfWeek(now));
    endDate.setMilliseconds(-1);
    const startDate = startOfWeek(endDate);
    return { label: 'last week', startDate, endDate };
  }

  if (input.includes('last 7 days')) {
    const startDate = startOfDay(now);
    startDate.setDate(startDate.getDate() - 6);
    return { label: 'last 7 days', startDate, endDate: endOfDay(now) };
  }

  if (input.includes('yesterday')) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return { label: 'yesterday', startDate: startOfDay(date), endDate: endOfDay(date) };
  }

  if (input.includes('today')) {
    return { label: 'today', startDate: startOfDay(now), endDate: endOfDay(now) };
  }

  const specificDate = parseSpecificDate(input);
  if (specificDate) {
    return {
      label: specificDate.toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' }),
      startDate: startOfDay(specificDate),
      endDate: endOfDay(specificDate),
    };
  }

  const weekday = parseWeekday(input);
  if (weekday) {
    return { label: weekday.label, startDate: startOfDay(weekday.date), endDate: endOfDay(weekday.date) };
  }

  return { label: 'today', startDate: startOfDay(now), endDate: endOfDay(now) };
}

function formatMealTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-SG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseGoalChoice(input: string): GoalType | null {
  const lower = input.toLowerCase();
  if (lower === '1' || lower.includes('lose')) return 'lose_weight';
  if (lower === '2' || lower.includes('maintain')) return 'maintain_weight';
  if (lower === '3' || lower.includes('gain')) return 'gain_weight';
  return null;
}

function parseGender(input: string): Gender | null {
  const lower = input.toLowerCase().trim();
  if (lower === 'f' || lower === 'female' || lower === 'woman') return 'female';
  if (lower === 'm' || lower === 'male' || lower === 'man') return 'male';
  return null;
}

function parseActivity(input: string): ActivityLevel | null {
  const lower = input.toLowerCase();
  if (lower === '1' || lower.includes('sedentary')) return 'sedentary';
  if (lower === '2' || lower.includes('light')) return 'lightly_active';
  if (lower === '3' || lower.includes('moderate')) return 'moderately_active';
  if (lower === '4' || lower.includes('very') || lower.includes('daily')) return 'very_active';
  return null;
}

function parseBody(input: string): { age: number; heightCm: number; weightKg: number } | null {
  const numbers = input.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length < 3) return null;
  const [age, heightCm, weightKg] = numbers;
  if (age < 10 || age > 100 || heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 250) return null;
  return { age, heightCm, weightKg };
}

function calculateGoal(draft: GoalDraft): UserGoal {
  const data = draft.data;
  const goal = data.goal as GoalType;
  const gender = data.gender as Gender;
  const activityLevel = data.activityLevel as ActivityLevel;
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

function goalQuestion(step: GoalFlowStep): string {
  if (step === 'goal') return 'What is your goal?\n1. Lose weight\n2. Maintain weight\n3. Gain weight';
  if (step === 'gender') return 'Gender?\nMale or Female';
  if (step === 'activity') return 'Activity level?\n1. Sedentary\n2. Lightly active\n3. Moderately active\n4. Very active';
  return 'Age, height, and weight?\nReply like: 32 175 72';
}

function goalReplyMarkup(step: GoalFlowStep): unknown {
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

function formatGoal(goal: UserGoal): string {
  return `Goal saved: ${goalLabels[goal.goal]}\nDaily target: ${goal.dailyCalories} cal\nProtein target: ${goal.proteinTarget}g\nMaintenance estimate: ${goal.maintenanceCalories} cal\nProfile: ${goal.gender}, ${goal.age}y, ${goal.heightCm}cm, ${goal.weightKg}kg, ${activityLabels[goal.activityLevel]}\n\nYou can run /goal again anytime to edit it.`;
}

export async function handleGoal(request: AgentRequest): Promise<AgentResponse<UserGoal | null>> {
  const userId = userKey(request);
  const input = cleanCommand(request.userInput, 'goal');
  const user = await nutritionStore.getUser(userId, request.chatId);

  if (!user.goalDraft || request.userInput.toLowerCase().startsWith('/goal')) {
    if (!input) {
      await nutritionStore.setGoalDraft(userId, { step: 'goal', data: {} }, request.chatId);
      return response(Intent.GOAL, true, null, goalQuestion('goal'), undefined, goalReplyMarkup('goal'));
    }
  }

  const draft = user.goalDraft || { step: 'goal', data: {} };
  let nextStep: GoalFlowStep | null = null;
  let errorMessage: string | null = null;

  if (draft.step === 'goal') {
    const goal = parseGoalChoice(input || request.userInput);
    if (goal) {
      draft.data.goal = goal;
      nextStep = 'gender';
    } else {
      errorMessage = goalQuestion('goal');
    }
  } else if (draft.step === 'gender') {
    const gender = parseGender(request.userInput);
    if (gender) {
      draft.data.gender = gender;
      nextStep = 'activity';
    } else {
      errorMessage = goalQuestion('gender');
    }
  } else if (draft.step === 'activity') {
    const activityLevel = parseActivity(request.userInput);
    if (activityLevel) {
      draft.data.activityLevel = activityLevel;
      nextStep = 'body';
    } else {
      errorMessage = goalQuestion('activity');
    }
  } else {
    const body = parseBody(request.userInput);
    if (body) {
      Object.assign(draft.data, body);
      const goal = calculateGoal(draft);
      await nutritionStore.setGoal(userId, goal, request.chatId);
      return response(Intent.GOAL, true, goal, formatGoal(goal), undefined, { remove_keyboard: true });
    }
    errorMessage = goalQuestion('body');
  }

  if (errorMessage) {
    await nutritionStore.setGoalDraft(userId, draft, request.chatId);
    return response(Intent.GOAL, false, null, errorMessage, 'Invalid goal response', goalReplyMarkup(draft.step));
  }

  draft.step = nextStep!;
  await nutritionStore.setGoalDraft(userId, draft, request.chatId);
  return response(Intent.GOAL, true, null, goalQuestion(draft.step), undefined, goalReplyMarkup(draft.step));
}

export async function handleLog(request: AgentRequest, image?: { data: string; mimeType: string }): Promise<AgentResponse<Meal | null>> {
  try {
    const text = cleanCommand(request.userInput, 'log') || request.userInput;
    const nutrition = await estimateNutrition(text, image);
    const meal: Meal = {
      id: mealId(),
      userId: userKey(request),
      chatId: request.chatId,
      source: image ? 'image' : 'text',
      rawInput: text || 'photo',
      nutrition,
      timestamp: new Date().toISOString(),
    };

    await nutritionStore.addMeal(meal.userId, meal, request.chatId);
    return response(Intent.LOG, true, meal, `Logged: ${nutrition.food}\n${nutrition.calories} cal | Protein ${nutrition.protein}g | Carbs ${nutrition.carbs}g | Fat ${nutrition.fat}g | Sugar ${nutrition.sugar}g\nConfidence: ${Math.round(nutrition.confidence * 100)}%`);
  } catch (error) {
    return failure(Intent.LOG, error, 'I could not log that meal. Check GEMINI_API_KEY or try a clearer description.');
  }
}

export async function handleAnalyze(request: AgentRequest, image?: { data: string; mimeType: string }): Promise<AgentResponse<NutritionData | null>> {
  try {
    const text = cleanCommand(request.userInput, 'analyse') || cleanCommand(request.userInput, 'analyze') || request.userInput;
    const nutrition = await estimateNutrition(text, image);
    return response(Intent.ANALYZE, true, nutrition, `Analysis: ${nutrition.food}\n${nutrition.calories} cal | Protein ${nutrition.protein}g | Carbs ${nutrition.carbs}g | Fat ${nutrition.fat}g | Sugar ${nutrition.sugar}g\nConfidence: ${Math.round(nutrition.confidence * 100)}%`);
  } catch (error) {
    return failure(Intent.ANALYZE, error, 'I could not analyse that meal. Try adding portion size or a clearer photo.');
  }
}

export async function handleSummary(request: AgentRequest): Promise<AgentResponse<SummaryData>> {
  const userId = userKey(request);
  const user = await nutritionStore.getUser(userId, request.chatId);
  const period = parseSummaryPeriod(request.userInput);
  const { startDate, endDate, dayCount } = getDateRange(period);
  const meals = await nutritionStore.getMealsByDateRange(userId, startDate, endDate);
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
  const message = `Summary for ${period}\nMeals: ${meals.length}\nTotal: ${roundedTotals.calories} cal | Protein ${roundedTotals.protein}g | Carbs ${roundedTotals.carbs}g | Fat ${roundedTotals.fat}g | Sugar ${roundedTotals.sugar}g\nAverage/day: ${averagePerDay.calories} cal | Protein ${averagePerDay.protein}g${targetLine}${mealLines ? `\n\nRecent meals:\n${mealLines}` : ''}`;

  return response(Intent.SUMMARY, true, {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totals: roundedTotals,
    averagePerDay,
    remainingCalories,
    meals,
  }, message);
}

export async function handleLogs(request: AgentRequest): Promise<AgentResponse<LogsData>> {
  const userId = userKey(request);
  const range = parseLogsRange(request.userInput);
  const meals = await nutritionStore.getMealsByDateRange(userId, range.startDate, range.endDate);
  const sortedMeals = meals.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sortedMeals.length === 0) {
    return response(Intent.LOGS, true, {
      label: range.label,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      meals: sortedMeals,
    }, `Logs for ${range.label}\nNo meals logged.`);
  }

  const lines = sortedMeals.map((meal, index) => {
    const nutrition = meal.nutrition;
    return `${index + 1}. ${formatMealTime(meal.timestamp)} - ${nutrition.food}: ${nutrition.calories} cal, Protein ${nutrition.protein}g, Carbs ${nutrition.carbs}g, Fat ${nutrition.fat}g, Sugar ${nutrition.sugar}g`;
  });
  let message = `Logs for ${range.label}\nMeals: ${sortedMeals.length}\n\n${lines.join('\n')}`;

  if (message.length > 3900) {
    const visibleLines: string[] = [];
    message = `Logs for ${range.label}\nMeals: ${sortedMeals.length}\n\n`;
    for (const line of lines) {
      if (`${message}${visibleLines.join('\n')}\n${line}`.length > 3750) break;
      visibleLines.push(line);
    }
    message += `${visibleLines.join('\n')}\n\nShowing ${visibleLines.length} of ${sortedMeals.length} meals. Narrow the date range to see the rest.`;
  }

  return response(Intent.LOGS, true, {
    label: range.label,
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString(),
    meals: sortedMeals,
  }, message);
}

export async function handleEditLog(request: AgentRequest): Promise<AgentResponse<LogsData>> {
  const userId = userKey(request);
  const range = parseLogsRange(request.userInput.replace(/^\/edit_log(?:@\w+)?/i, '/logs'));
  const meals = await nutritionStore.getMealsByDateRange(userId, range.startDate, range.endDate);
  const sortedMeals = meals.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sortedMeals.length === 0) {
    return response(Intent.EDIT_LOG, true, {
      label: range.label,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      meals: sortedMeals,
    }, `Edit logs for ${range.label}\nNo meals logged.`);
  }

  const visibleMeals = sortedMeals.slice(0, 20);
  const lines = visibleMeals.map((meal, index) => {
    const nutrition = meal.nutrition;
    return `${index + 1}. ${formatMealTime(meal.timestamp)} - ${nutrition.food}: ${nutrition.calories} cal`;
  });
  const extraLine = sortedMeals.length > visibleMeals.length
    ? `\n\nShowing ${visibleMeals.length} of ${sortedMeals.length} meals. Use a narrower duration to edit older items.`
    : '';
  const replyMarkup = {
    inline_keyboard: visibleMeals.map((meal, index) => [
      { text: `Delete ${index + 1}`, callback_data: `delete_log:${meal.id}` },
    ]),
  };

  return response(Intent.EDIT_LOG, true, {
    label: range.label,
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString(),
    meals: sortedMeals,
  }, `Edit logs for ${range.label}\nTap a button to delete a meal.\n\n${lines.join('\n')}${extraLine}`, undefined, replyMarkup);
}

export async function handleDeleteLog(userId: string, mealId: string): Promise<AgentResponse<Meal | null>> {
  const deletedMeal = await nutritionStore.deleteMeal(userId, mealId);
  if (!deletedMeal) {
    return response(Intent.EDIT_LOG, false, null, 'That meal was already deleted or could not be found.', 'Meal not found');
  }

  return response(
    Intent.EDIT_LOG,
    true,
    deletedMeal,
    `Deleted: ${deletedMeal.nutrition.food}\n${deletedMeal.nutrition.calories} cal | Protein ${deletedMeal.nutrition.protein}g | Carbs ${deletedMeal.nutrition.carbs}g | Fat ${deletedMeal.nutrition.fat}g | Sugar ${deletedMeal.nutrition.sugar}g`
  );
}

export async function handleRecommend(request: AgentRequest): Promise<AgentResponse<RecommendationData | null>> {
  try {
    const userId = userKey(request);
    const user = await nutritionStore.getUser(userId, request.chatId);
    const place = cleanCommand(request.userInput, 'recommend') || 'hawker';
    const today = await handleSummary({ ...request, userInput: '/summary by day' });
    const remainingCalories = today.data?.remainingCalories ?? user.goal?.dailyCalories;
    const goalContext = user.goal ? `${goalLabels[user.goal.goal]}, ${user.goal.dailyCalories} daily calories, ${user.goal.proteinTarget}g protein target` : 'No saved goal yet';
    const ntucRule = place.toLowerCase().includes('home') ? 'For home, recommend only ingredients commonly available at NTUC Singapore and minimal-effort meals.' : '';
    const prompt = `Recommend food for place/context: ${place}. User goal: ${goalContext}. Remaining calories today: ${remainingCalories ?? 'unknown'}. Prefer fat loss while preserving muscle: high protein, sensible calories, not too sugary. ${ntucRule} Return a short practical Telegram-ready answer with 3 options and estimated calories/protein.`;
    const recommendation = await callGemini([{ text: prompt }], 'You are Nutrisaur, a Singapore-aware nutrition coach. Be practical, specific, and concise.');
    return response(Intent.RECOMMEND, true, { place, recommendation }, recommendation);
  } catch (error) {
    return failure(Intent.RECOMMEND, error, 'I could not create recommendations right now. Check GEMINI_API_KEY and try again.');
  }
}

export async function handleHelp(): Promise<AgentResponse<null>> {
  return response(Intent.HELP, true, null, `Nutrisaur commands\n/goal - set or edit your calorie goal\n/log chicken rice - analyse and save a meal\n/logs today|yesterday|last monday|2026-05-02|this week - show logged meals\n/edit_log today|yesterday|last monday|2026-05-02|this week - delete logged meals with buttons\n/analyse chicken rice - analyse without saving\n/summary by day|week|month - totals and averages\n/recommend hawker|home|restaurant - food ideas based on your goal\n\nYou can also type "I ate chicken rice" or send a food photo with /log or /analyse.`);
}

function response<T>(intent: Intent, success: boolean, data: T, message: string, error?: string, replyMarkup?: unknown): AgentResponse<T> {
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

function failure(intent: Intent, error: unknown, message: string): AgentResponse<null> {
  const errorMsg = error instanceof Error ? error.message : String(error);
  logError(new Error(errorMsg), intent);
  return response(intent, false, null, message, errorMsg);
}

export async function getUserRecord(request: AgentRequest): Promise<UserRecord> {
  return nutritionStore.getUser(userKey(request), request.chatId);
}
