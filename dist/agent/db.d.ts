import { GoalDraft, Meal, NutritionCacheEntry, NutritionData, UserGoal, UserRecord } from './types';
interface NutritionStore {
    getUser(userId: string, chatId?: number): Promise<UserRecord>;
    setGoal(userId: string, goal: UserGoal, chatId?: number): Promise<UserRecord>;
    setGoalDraft(userId: string, goalDraft: GoalDraft, chatId?: number): Promise<UserRecord>;
    clearGoalDraft(userId: string): Promise<void>;
    addMeal(userId: string, meal: Meal, chatId?: number): Promise<Meal>;
    getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Meal[]>;
    deleteMeal(userId: string, mealId: string): Promise<Meal | null>;
    getCachedNutrition(key: string): Promise<NutritionCacheEntry | null>;
    setCachedNutrition(key: string, source: 'text' | 'image', input: string, nutrition: NutritionData): Promise<NutritionCacheEntry>;
    clear(): Promise<void>;
}
declare class SupabaseNutritionStore implements NutritionStore {
    private readonly serviceRoleKey;
    private readonly restUrl;
    constructor(supabaseUrl: string, serviceRoleKey: string);
    private headers;
    private request;
    private upsertUserShell;
    getUser(userId: string, chatId?: number): Promise<UserRecord>;
    setGoal(userId: string, goal: UserGoal, chatId?: number): Promise<UserRecord>;
    setGoalDraft(userId: string, goalDraft: GoalDraft, chatId?: number): Promise<UserRecord>;
    clearGoalDraft(userId: string): Promise<void>;
    addMeal(userId: string, meal: Meal, chatId?: number): Promise<Meal>;
    getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Meal[]>;
    deleteMeal(userId: string, mealId: string): Promise<Meal | null>;
    getCachedNutrition(key: string): Promise<NutritionCacheEntry | null>;
    setCachedNutrition(key: string, source: 'text' | 'image', input: string, nutrition: NutritionData): Promise<NutritionCacheEntry>;
    clear(): Promise<void>;
}
declare class JsonNutritionStore implements NutritionStore {
    private readonly filePath;
    private loaded;
    private data;
    constructor(filePath: string);
    private load;
    private save;
    getUser(userId: string, chatId?: number): Promise<UserRecord>;
    setGoal(userId: string, goal: UserGoal, chatId?: number): Promise<UserRecord>;
    setGoalDraft(userId: string, goalDraft: GoalDraft, chatId?: number): Promise<UserRecord>;
    clearGoalDraft(userId: string): Promise<void>;
    addMeal(userId: string, meal: Meal, chatId?: number): Promise<Meal>;
    getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Meal[]>;
    deleteMeal(userId: string, mealId: string): Promise<Meal | null>;
    getCachedNutrition(key: string): Promise<NutritionCacheEntry | null>;
    setCachedNutrition(key: string, source: 'text' | 'image', input: string, nutrition: NutritionData): Promise<NutritionCacheEntry>;
    clear(): Promise<void>;
}
export declare const nutritionStore: NutritionStore;
export { JsonNutritionStore, SupabaseNutritionStore };
export type { NutritionStore };
//# sourceMappingURL=db.d.ts.map