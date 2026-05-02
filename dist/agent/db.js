"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonNutritionStore = exports.nutritionStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const emptyStore = () => ({ users: {}, nutritionCache: {} });
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
exports.nutritionStore = new JsonNutritionStore(config_1.config.dataFile);
//# sourceMappingURL=db.js.map