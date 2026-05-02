"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSummary = exports.handleRecommend = exports.handleLogs = exports.handleLog = exports.handleHelp = exports.handleGoal = exports.handleEditLog = exports.handleDeleteLog = exports.handleAnalyze = exports.Intent = exports.nutritionStore = exports.classifyIntent = void 0;
exports.runAgent = runAgent;
const telegram_1 = require("../services/telegram");
const classifier_1 = require("./classifier");
const handlers_1 = require("./handlers");
const types_1 = require("./types");
const logger_1 = require("../middleware/logger");
async function runAgent(request) {
    try {
        const userInput = request.userInput?.trim() || '';
        const hasPhoto = Boolean(request.photo?.fileId);
        if (!userInput && !hasPhoto) {
            return {
                intent: types_1.Intent.HELP,
                success: false,
                data: null,
                message: 'Send a meal, photo, or /help.',
                timestamp: new Date().toISOString(),
                error: 'Empty input',
            };
        }
        const user = await (0, handlers_1.getUserRecord)(request);
        const intent = user.goalDraft && !userInput.startsWith('/') ? types_1.Intent.GOAL : (0, classifier_1.classifyIntent)(userInput, hasPhoto);
        const image = request.photo?.fileId ? await (0, telegram_1.downloadTelegramFile)(request.photo.fileId) : undefined;
        switch (intent) {
            case types_1.Intent.GOAL:
                return (0, handlers_1.handleGoal)(request);
            case types_1.Intent.LOG:
                return (0, handlers_1.handleLog)(request, image);
            case types_1.Intent.LOGS:
                return (0, handlers_1.handleLogs)(request);
            case types_1.Intent.EDIT_LOG:
                return (0, handlers_1.handleEditLog)(request);
            case types_1.Intent.ANALYZE:
                return (0, handlers_1.handleAnalyze)(request, image);
            case types_1.Intent.SUMMARY:
                return (0, handlers_1.handleSummary)(request);
            case types_1.Intent.RECOMMEND:
                return (0, handlers_1.handleRecommend)(request);
            case types_1.Intent.HELP:
            default:
                return (0, handlers_1.handleHelp)();
        }
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        (0, logger_1.logError)(new Error(errorMsg), 'runAgent');
        return {
            intent: types_1.Intent.HELP,
            success: false,
            data: null,
            message: 'Something went wrong while processing that. Please try again.',
            timestamp: new Date().toISOString(),
            error: errorMsg,
        };
    }
}
var classifier_2 = require("./classifier");
Object.defineProperty(exports, "classifyIntent", { enumerable: true, get: function () { return classifier_2.classifyIntent; } });
var db_1 = require("./db");
Object.defineProperty(exports, "nutritionStore", { enumerable: true, get: function () { return db_1.nutritionStore; } });
var types_2 = require("./types");
Object.defineProperty(exports, "Intent", { enumerable: true, get: function () { return types_2.Intent; } });
var handlers_2 = require("./handlers");
Object.defineProperty(exports, "handleAnalyze", { enumerable: true, get: function () { return handlers_2.handleAnalyze; } });
Object.defineProperty(exports, "handleDeleteLog", { enumerable: true, get: function () { return handlers_2.handleDeleteLog; } });
Object.defineProperty(exports, "handleEditLog", { enumerable: true, get: function () { return handlers_2.handleEditLog; } });
Object.defineProperty(exports, "handleGoal", { enumerable: true, get: function () { return handlers_2.handleGoal; } });
Object.defineProperty(exports, "handleHelp", { enumerable: true, get: function () { return handlers_2.handleHelp; } });
Object.defineProperty(exports, "handleLog", { enumerable: true, get: function () { return handlers_2.handleLog; } });
Object.defineProperty(exports, "handleLogs", { enumerable: true, get: function () { return handlers_2.handleLogs; } });
Object.defineProperty(exports, "handleRecommend", { enumerable: true, get: function () { return handlers_2.handleRecommend; } });
Object.defineProperty(exports, "handleSummary", { enumerable: true, get: function () { return handlers_2.handleSummary; } });
//# sourceMappingURL=index.js.map