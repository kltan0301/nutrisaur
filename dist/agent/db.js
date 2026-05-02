"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseNutritionStore = exports.JsonNutritionStore = exports.nutritionStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const emptyStore = () => ({ users: {}, nutritionCache: {} });
function userFromRow(row, meals = []) {
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
function mealFromRow(row) {
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
function cacheFromRow(row) {
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
class SupabaseNutritionStore {
    constructor(supabaseUrl, serviceRoleKey) {
        this.serviceRoleKey = serviceRoleKey;
        this.restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
    }
    headers(extra) {
        return {
            apikey: this.serviceRoleKey,
            Authorization: `Bearer ${this.serviceRoleKey}`,
            'Content-Type': 'application/json',
            ...extra,
        };
    }
    async request(pathAndQuery, init = {}) {
        const response = await fetch(`${this.restUrl}${pathAndQuery}`, {
            ...init,
            headers: this.headers(init.headers),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Supabase request failed (${response.status}): ${body}`);
        }
        const body = await response.text();
        if (!body.trim())
            return undefined;
        return JSON.parse(body);
    }
    async upsertUserShell(userId, chatId) {
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
    async getUser(userId, chatId) {
        await this.upsertUserShell(userId, chatId);
        const rows = await this.request(`/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`);
        const user = rows[0];
        if (!user)
            throw new Error(`Failed to load Supabase user: ${userId}`);
        const meals = await this.request(`/nutrisaur_meals?user_id=eq.${encodeURIComponent(userId)}&select=*&order=timestamp.asc`);
        return userFromRow(user, meals.map(mealFromRow));
    }
    async setGoal(userId, goal, chatId) {
        await this.upsertUserShell(userId, chatId);
        const rows = await this.request(`/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
                chat_id: chatId,
                goal,
                goal_draft: null,
                updated_at: new Date().toISOString(),
            }),
        });
        return userFromRow(rows[0], []);
    }
    async setGoalDraft(userId, goalDraft, chatId) {
        await this.upsertUserShell(userId, chatId);
        const rows = await this.request(`/nutrisaur_users?id=eq.${encodeURIComponent(userId)}&select=*`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
                chat_id: chatId,
                goal_draft: goalDraft,
                updated_at: new Date().toISOString(),
            }),
        });
        return userFromRow(rows[0], []);
    }
    async clearGoalDraft(userId) {
        await this.request(`/nutrisaur_users?id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            body: JSON.stringify({
                goal_draft: null,
                updated_at: new Date().toISOString(),
            }),
        });
    }
    async addMeal(userId, meal, chatId) {
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
    async getMealsByDateRange(userId, startDate, endDate) {
        await this.upsertUserShell(userId);
        const rows = await this.request(`/nutrisaur_meals?user_id=eq.${encodeURIComponent(userId)}&timestamp=gte.${encodeURIComponent(startDate.toISOString())}&timestamp=lte.${encodeURIComponent(endDate.toISOString())}&select=*&order=timestamp.asc`);
        return rows.map(mealFromRow);
    }
    async deleteMeal(userId, mealId) {
        const rows = await this.request(`/nutrisaur_meals?id=eq.${encodeURIComponent(mealId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`, {
            method: 'DELETE',
            headers: { Prefer: 'return=representation' },
        });
        return rows[0] ? mealFromRow(rows[0]) : null;
    }
    async getCachedNutrition(key) {
        const rows = await this.request(`/nutrisaur_nutrition_cache?key=eq.${encodeURIComponent(key)}&select=*`);
        const row = rows[0];
        if (!row)
            return null;
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
    async setCachedNutrition(key, source, input, nutrition) {
        const now = new Date().toISOString();
        const existing = await this.request(`/nutrisaur_nutrition_cache?key=eq.${encodeURIComponent(key)}&select=*`);
        const hitCount = existing[0]?.hit_count || 0;
        const rows = await this.request('/nutrisaur_nutrition_cache', {
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
    async clear() {
        await this.request('/nutrisaur_meals?id=not.is.null', { method: 'DELETE' });
        await this.request('/nutrisaur_nutrition_cache?key=not.is.null', { method: 'DELETE' });
        await this.request('/nutrisaur_users?id=not.is.null', { method: 'DELETE' });
    }
}
exports.SupabaseNutritionStore = SupabaseNutritionStore;
class JsonNutritionStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.loaded = false;
        this.data = emptyStore();
    }
    async load() {
        var _a, _b;
        if (this.loaded)
            return;
        try {
            const raw = await promises_1.default.readFile(this.filePath, 'utf8');
            this.data = JSON.parse(raw);
            (_a = this.data).users || (_a.users = {});
            (_b = this.data).nutritionCache || (_b.nutritionCache = {});
        }
        catch (error) {
            const code = error.code;
            if (code !== 'ENOENT')
                throw error;
            this.data = emptyStore();
            await this.save();
        }
        this.loaded = true;
    }
    async save() {
        await promises_1.default.mkdir(path_1.default.dirname(this.filePath), { recursive: true });
        await promises_1.default.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    }
    async getUser(userId, chatId) {
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
        }
        else if (chatId && this.data.users[userId].chatId !== chatId) {
            this.data.users[userId].chatId = chatId;
            this.data.users[userId].updatedAt = now;
            await this.save();
        }
        return this.data.users[userId];
    }
    async setGoal(userId, goal, chatId) {
        const user = await this.getUser(userId, chatId);
        user.goal = goal;
        delete user.goalDraft;
        user.updatedAt = new Date().toISOString();
        await this.save();
        return user;
    }
    async setGoalDraft(userId, goalDraft, chatId) {
        const user = await this.getUser(userId, chatId);
        user.goalDraft = goalDraft;
        user.updatedAt = new Date().toISOString();
        await this.save();
        return user;
    }
    async clearGoalDraft(userId) {
        const user = await this.getUser(userId);
        delete user.goalDraft;
        user.updatedAt = new Date().toISOString();
        await this.save();
    }
    async addMeal(userId, meal, chatId) {
        const user = await this.getUser(userId, chatId);
        user.meals.push(meal);
        user.updatedAt = new Date().toISOString();
        await this.save();
        return meal;
    }
    async getMealsByDateRange(userId, startDate, endDate) {
        const user = await this.getUser(userId);
        const startMs = startDate.getTime();
        const endMs = endDate.getTime();
        return user.meals.filter((meal) => {
            const mealMs = new Date(meal.timestamp).getTime();
            return mealMs >= startMs && mealMs <= endMs;
        });
    }
    async deleteMeal(userId, mealId) {
        const user = await this.getUser(userId);
        const mealIndex = user.meals.findIndex((meal) => meal.id === mealId);
        if (mealIndex < 0)
            return null;
        const [deletedMeal] = user.meals.splice(mealIndex, 1);
        user.updatedAt = new Date().toISOString();
        await this.save();
        return deletedMeal;
    }
    async getCachedNutrition(key) {
        await this.load();
        const entry = this.data.nutritionCache[key];
        if (!entry)
            return null;
        entry.hitCount += 1;
        entry.updatedAt = new Date().toISOString();
        await this.save();
        return entry;
    }
    async setCachedNutrition(key, source, input, nutrition) {
        await this.load();
        const now = new Date().toISOString();
        const existing = this.data.nutritionCache[key];
        const entry = {
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
    async clear() {
        this.data = emptyStore();
        this.loaded = true;
        await this.save();
    }
}
exports.JsonNutritionStore = JsonNutritionStore;
const useSupabase = Boolean(config_1.config.supabaseUrl && config_1.config.supabaseServiceRoleKey);
exports.nutritionStore = useSupabase
    ? new SupabaseNutritionStore(config_1.config.supabaseUrl, config_1.config.supabaseServiceRoleKey)
    : new JsonNutritionStore(config_1.config.dataFile);
//# sourceMappingURL=db.js.map