"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyIntent = classifyIntent;
const types_1 = require("./types");
function classifyIntent(userInput, hasPhoto = false) {
    const input = (userInput || '').trim().toLowerCase();
    if (input.startsWith('/goal'))
        return types_1.Intent.GOAL;
    if (input.startsWith('/edit_log'))
        return types_1.Intent.EDIT_LOG;
    if (input.startsWith('/logs'))
        return types_1.Intent.LOGS;
    if (input.startsWith('/log'))
        return types_1.Intent.LOG;
    if (input.startsWith('/analyse') || input.startsWith('/analyze'))
        return types_1.Intent.ANALYZE;
    if (input.startsWith('/summary'))
        return types_1.Intent.SUMMARY;
    if (input.startsWith('/recommend'))
        return types_1.Intent.RECOMMEND;
    if (input.startsWith('/start'))
        return types_1.Intent.START;
    if (input.startsWith('/help'))
        return types_1.Intent.HELP;
    if (hasPhoto)
        return types_1.Intent.ANALYZE;
    if (/\b(i ate|i have eaten|today i ate|just ate|had|consumed)\b/i.test(input))
        return types_1.Intent.LOG;
    if (/\b(summary|recap|today|this week|this month|total)\b/i.test(input))
        return types_1.Intent.SUMMARY;
    if (/\b(calories|nutrition|protein|carbs|fat|sugar|analyse|analyze|estimate)\b/i.test(input))
        return types_1.Intent.ANALYZE;
    return types_1.Intent.LOG;
}
//# sourceMappingURL=classifier.js.map