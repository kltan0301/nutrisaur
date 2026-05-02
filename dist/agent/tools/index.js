"use strict";
/**
 * Tools module for the nutrition tracker agent
 * Exports all available tools for processing nutrition requests
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = exports.getStorageStats = exports.getStoreConfig = exports.updateStoreConfig = exports.getUserRawLog = exports.getAllUsers = exports.getUserEntryCount = exports.clearUserLogs = exports.clearAllLogs = exports.getSummary = exports.logFood = exports.addCustomFood = exports.isFoodSupported = exports.getSupportedFoods = exports.analyzeFood = void 0;
var nutrition_1 = require("./nutrition");
Object.defineProperty(exports, "analyzeFood", { enumerable: true, get: function () { return nutrition_1.analyzeFood; } });
Object.defineProperty(exports, "getSupportedFoods", { enumerable: true, get: function () { return nutrition_1.getSupportedFoods; } });
Object.defineProperty(exports, "isFoodSupported", { enumerable: true, get: function () { return nutrition_1.isFoodSupported; } });
Object.defineProperty(exports, "addCustomFood", { enumerable: true, get: function () { return nutrition_1.addCustomFood; } });
var storage_1 = require("./storage");
Object.defineProperty(exports, "logFood", { enumerable: true, get: function () { return storage_1.logFood; } });
Object.defineProperty(exports, "getSummary", { enumerable: true, get: function () { return storage_1.getSummary; } });
Object.defineProperty(exports, "clearAllLogs", { enumerable: true, get: function () { return storage_1.clearAllLogs; } });
Object.defineProperty(exports, "clearUserLogs", { enumerable: true, get: function () { return storage_1.clearUserLogs; } });
Object.defineProperty(exports, "getUserEntryCount", { enumerable: true, get: function () { return storage_1.getUserEntryCount; } });
Object.defineProperty(exports, "getAllUsers", { enumerable: true, get: function () { return storage_1.getAllUsers; } });
Object.defineProperty(exports, "getUserRawLog", { enumerable: true, get: function () { return storage_1.getUserRawLog; } });
Object.defineProperty(exports, "updateStoreConfig", { enumerable: true, get: function () { return storage_1.updateStoreConfig; } });
Object.defineProperty(exports, "getStoreConfig", { enumerable: true, get: function () { return storage_1.getStoreConfig; } });
Object.defineProperty(exports, "getStorageStats", { enumerable: true, get: function () { return storage_1.getStorageStats; } });
/**
 * Tools namespace for easy access
 */
exports.tools = {
    // Nutrition analysis
    analyzeFood: (input) => Promise.resolve().then(() => __importStar(require('./nutrition'))).then((m) => m.analyzeFood(input)),
    getSupportedFoods: () => Promise.resolve().then(() => __importStar(require('./nutrition'))).then((m) => m.getSupportedFoods()),
    isFoodSupported: (food) => Promise.resolve().then(() => __importStar(require('./nutrition'))).then((m) => m.isFoodSupported(food)),
    // Storage
    logFood: (userId, nutrition) => Promise.resolve().then(() => __importStar(require('./storage'))).then((m) => m.logFood(userId, nutrition)),
    getSummary: (userId, date) => Promise.resolve().then(() => __importStar(require('./storage'))).then((m) => m.getSummary(userId, date)),
    clearAllLogs: () => Promise.resolve().then(() => __importStar(require('./storage'))).then((m) => m.clearAllLogs()),
    getUserStats: (userId) => Promise.resolve().then(() => __importStar(require('./storage'))).then((m) => ({
        entries: m.getUserEntryCount(userId),
        rawLog: m.getUserRawLog(userId),
    })),
};
//# sourceMappingURL=index.js.map