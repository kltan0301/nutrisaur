export declare enum Intent {
    GOAL = "GOAL",
    LOG = "LOG",
    ANALYZE = "ANALYZE",
    SUMMARY = "SUMMARY",
    RECOMMEND = "RECOMMEND",
    HELP = "HELP"
}
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight';
export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type GoalFlowStep = 'goal' | 'gender' | 'activity' | 'body';
export type SummaryPeriod = 'day' | 'week' | 'month';
export interface NutritionData {
    food: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    confidence: number;
}
export interface Meal {
    id: string;
    userId: string;
    chatId?: number;
    source: 'text' | 'image';
    rawInput: string;
    nutrition: NutritionData;
    timestamp: string;
}
export interface NutritionCacheEntry {
    key: string;
    source: 'text' | 'image';
    input: string;
    nutrition: NutritionData;
    createdAt: string;
    updatedAt: string;
    hitCount: number;
}
export interface UserGoal {
    goal: GoalType;
    gender: Gender;
    activityLevel: ActivityLevel;
    age: number;
    heightCm: number;
    weightKg: number;
    bmr: number;
    maintenanceCalories: number;
    dailyCalories: number;
    proteinTarget: number;
    updatedAt: string;
}
export interface GoalDraft {
    step: GoalFlowStep;
    data: Partial<UserGoal>;
}
export interface UserRecord {
    id: string;
    chatId?: number;
    goal?: UserGoal;
    goalDraft?: GoalDraft;
    meals: Meal[];
    createdAt: string;
    updatedAt: string;
}
export interface SummaryTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
}
export interface SummaryData {
    period: SummaryPeriod;
    startDate: string;
    endDate: string;
    totals: SummaryTotals;
    averagePerDay: SummaryTotals;
    remainingCalories?: number;
    meals: Meal[];
}
export interface RecommendationData {
    place: string;
    recommendation: string;
}
export interface AgentRequest {
    userInput: string;
    userId?: number;
    chatId?: number;
    photo?: {
        fileId: string;
        mimeType?: string;
    };
}
export interface AgentResponse<T = unknown> {
    intent: Intent;
    success: boolean;
    data: T | null;
    message: string;
    timestamp: string;
    replyMarkup?: unknown;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map