import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
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

interface StoreFile {
  users: Record<string, UserRecord>;
  nutritionCache: Record<string, NutritionCacheEntry>;
}

interface SupabaseUserRow {
  id: string;
  chat_id?: number;
  goal?: UserGoal;
  goal_draft?: GoalDraft;
  created_at: string;
  updated_at: string;
}

interface SupabaseMealRow {
  id: string;
  user_id: string;
  chat_id?: number;
  source: 'text' | 'image';
  raw_input: string;
  nutrition: NutritionData;
  timestamp: string;
}

interface SupabaseCacheRow {
  key: string;
  source: 'text' | 'image';
  input: string;
  nutrition: NutritionData;
  created_at: string;
  updated_at: string;
  hit_count: number;
}

const emptyStore = (): StoreFile => ({ users: {}, nutritionCache: {} });

function userFromRow(row: SupabaseUserRow, meals: Meal[] = []): UserRecord {
  return {
    id: row.id,
    chatId: row.chat_id,
    goal: row.goal || undefined,
    goalDraft: row.goal_draft || undefined,
    meals,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mealFromRow(row: SupabaseMealRow): Meal {
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    source: row.source,
    rawInput: row.raw_input,
    nutrition: row.nutrition,
    timestamp: row.timestamp,
  };
}

function cacheFromRow(row: SupabaseCacheRow): NutritionCacheEntry {
  return {
    key: row.key,
    source: row.source,
    input: row.input,
    nutrition: row.nutrition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hitCount: row.hit_count,
  };
}

class SupabaseNutritionStore implements NutritionStore {
  private readonly restUrl: string;

  constructor(
    supabaseUrl: string,
    private readonly serviceRoleKey: string
  ) {
    this.restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private async request<T>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.restUrl}${pathAndQuery}`, {
      ...init,
      headers: this.headers(init.headers as Record<string, string> | undefined),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase request failed (${response.status}): ${body}`);
    }

    const body = await response.text();
    if (!body.trim()) return undefined as T;
    return JSON.parse(body) as T;
  }

  private async upsertUserShell(userId: string, chatId?: number): Promise<void> {
    const now = new Date().toISOString();
    await this.request('/nutrisaur_users', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        id: userId,
        chat_id: chatId,
        updated_at: now,
      }]),
    });
  }

  async getUser(userId: string, chatId?: number): Promise<UserRecord> {
    await this.upsertUserShell(userId, chatId);
    const rows = await this.request<SupabaseUserRow[]>(
      `/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`
    );
    const user = rows[0];
    if (!user) throw new Error(`Failed to load Supabase user: ${userId}`);

    const meals = await this.request<SupabaseMealRow[]>(
      `/nutrisaur_meals?user_id=eq.${encodeURIComponent(userId)}&select=*&order=timestamp.asc`
    );
    return userFromRow(user, meals.map(mealFromRow));
  }

  async setGoal(userId: string, goal: UserGoal, chatId?: number): Promise<UserRecord> {
    await this.upsertUserShell(userId, chatId);
    const rows = await this.request<SupabaseUserRow[]>(
      `/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          chat_id: chatId,
          goal,
          goal_draft: null,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    return userFromRow(rows[0], []);
  }

  async setGoalDraft(userId: string, goalDraft: GoalDraft, chatId?: number): Promise<UserRecord> {
    await this.upsertUserShell(userId, chatId);
    const rows = await this.request<SupabaseUserRow[]>(
      `/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          chat_id: chatId,
          goal_draft: goalDraft,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    return userFromRow(rows[0], []);
  }

  async clearGoalDraft(userId: string): Promise<void> {
    await this.request(`/nutrisaur_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        goal_draft: null,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async addMeal(userId: string, meal: Meal, chatId?: number): Promise<Meal> {
    await this.upsertUserShell(userId, chatId);
    await this.request('/nutrisaur_meals', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{
        id: meal.id,
        user_id: userId,
        chat_id: meal.chatId,
        source: meal.source,
        raw_input: meal.rawInput,
        nutrition: meal.nutrition,
        timestamp: meal.timestamp,
      }]),
    });
    return meal;
  }

  async getMealsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Meal[]> {
    await this.upsertUserShell(userId);
    const rows = await this.request<SupabaseMealRow[]>(
      `/nutrisaur_meals?user_id=eq.${encodeURIComponent(userId)}&timestamp=gte.${encodeURIComponent(startDate.toISOString())}&timestamp=lte.${encodeURIComponent(endDate.toISOString())}&select=*&order=timestamp.asc`
    );
    return rows.map(mealFromRow);
  }

  async deleteMeal(userId: string, mealId: string): Promise<Meal | null> {
    const rows = await this.request<SupabaseMealRow[]>(
      `/nutrisaur_meals?id=eq.${encodeURIComponent(mealId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      }
    );
    return rows[0] ? mealFromRow(rows[0]) : null;
  }

  async getCachedNutrition(key: string): Promise<NutritionCacheEntry | null> {
    const rows = await this.request<SupabaseCacheRow[]>(
      `/nutrisaur_nutrition_cache?key=eq.${encodeURIComponent(key)}&select=*`
    );
    const row = rows[0];
    if (!row) return null;

    const updatedAt = new Date().toISOString();
    await this.request(`/nutrisaur_nutrition_cache?key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        hit_count: row.hit_count + 1,
        updated_at: updatedAt,
      }),
    });

    return cacheFromRow({ ...row, hit_count: row.hit_count + 1, updated_at: updatedAt });
  }

  async setCachedNutrition(
    key: string,
    source: 'text' | 'image',
    input: string,
    nutrition: NutritionData
  ): Promise<NutritionCacheEntry> {
    const now = new Date().toISOString();
    const existing = await this.request<SupabaseCacheRow[]>(
      `/nutrisaur_nutrition_cache?key=eq.${encodeURIComponent(key)}&select=*`
    );
    const hitCount = existing[0]?.hit_count || 0;
    const rows = await this.request<SupabaseCacheRow[]>('/nutrisaur_nutrition_cache', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{
        key,
        source,
        input,
        nutrition,
        updated_at: now,
        hit_count: hitCount,
      }]),
    });
    return cacheFromRow(rows[0]);
  }

  async clear(): Promise<void> {
    await this.request('/nutrisaur_meals?id=not.is.null', { method: 'DELETE' });
    await this.request('/nutrisaur_nutrition_cache?key=not.is.null', { method: 'DELETE' });
    await this.request('/nutrisaur_users?id=not.is.null', { method: 'DELETE' });
  }
}

class JsonNutritionStore implements NutritionStore {
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

const useSupabase = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

export const nutritionStore: NutritionStore = useSupabase
  ? new SupabaseNutritionStore(config.supabaseUrl, config.supabaseServiceRoleKey)
  : new JsonNutritionStore(config.dataFile);

export { JsonNutritionStore, SupabaseNutritionStore };
export type { NutritionStore };
