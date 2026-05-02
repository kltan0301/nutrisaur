"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyIntent = classifyIntent;
const types_1 = require("./types");
function isCommand(input, command) {
    return new RegExp(`^/${command}(?:@\\w+)?(?:\\s|$)`, 'i').test(input);
}
function classifyIntent(userInput, hasPhoto = false) {
    const input = (userInput || '').trim().toLowerCase();
    if (isCommand(input, 'goal_remind'))
        return types_1.Intent.GOAL_REMIND;
    if (isCommand(input, 'goal'))
        return types_1.Intent.GOAL;
    if (isCommand(input, 'edit_log'))
        return types_1.Intent.EDIT_LOG;
    if (isCommand(input, 'logs'))
        return types_1.Intent.LOGS;
    if (isCommand(input, 'log'))
        return types_1.Intent.LOG;
    if (isCommand(input, 'analyse') || isCommand(input, 'analyze'))
        return types_1.Intent.ANALYZE;
    if (isCommand(input, 'summary'))
        return types_1.Intent.SUMMARY;
    if (isCommand(input, 'calories_remaining'))
        return types_1.Intent.CALORIES_REMAINING;
    if (isCommand(input, 'recommend'))
        return types_1.Intent.RECOMMEND;
    if (isCommand(input, 'start'))
        return types_1.Intent.START;
    if (isCommand(input, 'help'))
        return types_1.Intent.HELP;
    if (input.startsWith('/'))
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