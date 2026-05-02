import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { GoalDraft, Meal, NutritionCacheEntry, NutritionData, UserGoal, UserRecord } from './types';

interface StoreFile {
  users: Record<string, UserRecord>;
  nutritionCache: Record<string, NutritionCacheEntry>;
}

const emptyStore = (): StoreFile => ({ users: {}, nutritionCache: {} });

class JsonNutritionStore {
  private loaded = false;
  private data: StoreFile = emptyStore();

  constructor(private readonly filePath: string) {}

  private async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.data = JSON.parse(raw) as StoreFile;
      this.data.users ||= {};
      this.data.nutritionCache ||= {};
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
      this.data = emptyStore();
      await this.save();
    }

    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async getUser(userId: string, chatId?: number): Promise<UserRecord> {
    await this.load();

    const now = new Date().toISOString();
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        id: userId,
        chatId,
        meals: [],
        createdAt: now,
        updatedAt: now,
      };
      await this.save();
    } else if (chatId && this.data.users[userId].chatId !== chatId) {
      this.data.users[userId].chatId = chatId;
      this.data.users[userId].updatedAt = now;
      await this.save();
    }

    return this.data.users[userId];
  }

  async setGoal(userId: string, goal: UserGoal, chatId?: number): Promise<UserRecord> {
    const user = await this.getUser(userId, chatId);
    user.goal = goal;
    delete user.goalDraft;
    user.updatedAt = new Date().toISOString();
    await this.save();
    return user;
  }

  async setGoalDraft(userId: string, goalDraft: GoalDraft, chatId?: number): Promise<UserRecord> {
    const user = await this.getUser(userId, chatId);
    user.goalDraft = goalDraft;
    user.updatedAt = new Date().toISOString();
    await this.save();
    return user;
  }

  async clearGoalDraft(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    delete user.goalDraft;
    user.updatedAt = new Date().toISOString();
    await this.save();
  }

  async addMeal(userId: string, meal: Meal, chatId?: number): Promise<Meal> {
    const user = await this.getUser(userId, chatId);
    user.meals.push(meal);
    user.updatedAt = new Date().toISOString();
    await this.save();
    return meal;
  }

  async getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Meal[]> {
    const user = await this.getUser(userId);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return user.meals.filter((meal) => {
      const mealMs = new Date(meal.timestamp).getTime();
      return mealMs >= startMs && mealMs <= endMs;
    });
  }

  async deleteMeal(userId: string, mealId: string): Promise<Meal | null> {
    const user = await this.getUser(userId);
    const mealIndex = user.meals.findIndex((meal) => meal.id === mealId);
    if (mealIndex < 0) return null;

    const [deletedMeal] = user.meals.splice(mealIndex, 1);
    user.updatedAt = new Date().toISOString();
    await this.save();
    return deletedMeal;
  }

  async getCachedNutrition(key: string): Promise<NutritionCacheEntry | null> {
    await this.load();
    const entry = this.data.nutritionCache[key];
    if (!entry) return null;

    entry.hitCount += 1;
    entry.updatedAt = new Date().toISOString();
    await this.save();
    return entry;
  }

  async setCachedNutrition(
    key: string,
    source: 'text' | 'image',
    input: string,
    nutrition: NutritionData
  ): Promise<NutritionCacheEntry> {
    await this.load();
    const now = new Date().toISOString();
    const existing = this.data.nutritionCache[key];
    const entry: NutritionCacheEntry = {
      key,
      source,
      input,
      nutrition,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      hitCount: existing?.hitCount || 0,
    };

    this.data.nutritionCache[key] = entry;
    await this.save();
    return entry;
  }

  async clear(): Promise<void> {
    this.data = emptyStore();
    this.loaded = true;
    await this.save();
  }
}

export const nutritionStore = new JsonNutritionStore(config.dataFile);
export { JsonNutritionStore };
