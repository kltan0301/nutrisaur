"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
async function runAllTests() {
    assert((0, index_1.classifyIntent)('/goal') === index_1.Intent.GOAL, 'Expected /goal to classify as GOAL');
    assert((0, index_1.classifyIntent)('/goal_remind') === index_1.Intent.GOAL_REMIND, 'Expected /goal_remind to classify as GOAL_REMIND');
    assert((0, index_1.classifyIntent)('/start') === index_1.Intent.START, 'Expected /start to classify as START');
    assert((0, index_1.classifyIntent)('/help') === index_1.Intent.HELP, 'Expected /help to classify as HELP');
    assert((0, index_1.classifyIntent)('/edit_log today') === index_1.Intent.EDIT_LOG, 'Expected /edit_log to classify as EDIT_LOG');
    assert((0, index_1.classifyIntent)('/logs today') === index_1.Intent.LOGS, 'Expected /logs to classify as LOGS');
    assert((0, index_1.classifyIntent)('/log chicken rice') === index_1.Intent.LOG, 'Expected /log to classify as LOG');
    assert((0, index_1.classifyIntent)('/analyse chicken rice') === index_1.Intent.ANALYZE, 'Expected /analyse to classify as ANALYZE');
    assert((0, index_1.classifyIntent)('/summary by week') === index_1.Intent.SUMMARY, 'Expected /summary to classify as SUMMARY');
    assert((0, index_1.classifyIntent)('/calories_remaining') === index_1.Intent.CALORIES_REMAINING, 'Expected /calories_remaining to classify as CALORIES_REMAINING');
    assert((0, index_1.classifyIntent)('/recommend hawker') === index_1.Intent.RECOMMEND, 'Expected /recommend to classify as RECOMMEND');
    assert((0, index_1.classifyIntent)('I have eaten chicken rice') === index_1.Intent.LOG, 'Expected natural meal text to classify as LOG');
    const base = { userId: 900001, chatId: 900001 };
    let response = await (0, index_1.handleGoal)({ ...base, userInput: '/goal' });
    assert(response.success, 'Expected /goal to start successfully');
    response = await (0, index_1.handleGoal)({ ...base, userInput: '1' });
    assert(response.success && response.message.toLowerCase().includes('gender'), 'Expected goal step to ask gender');
    response = await (0, index_1.handleGoal)({ ...base, userInput: 'male' });
    assert(response.success && response.message.toLowerCase().includes('activity'), 'Expected gender step to ask activity');
    response = await (0, index_1.handleGoal)({ ...base, userInput: '3' });
    assert(response.success && response.message.toLowerCase().includes('age'), 'Expected activity step to ask body stats');
    response = await (0, index_1.handleGoal)({ ...base, userInput: '32 175 72' });
    assert(response.success && Boolean(response.data), 'Expected body stats to save a goal');
    assert(response.data?.gender === 'male', 'Expected male to be saved as male');
    const femaleBase = { userId: 900002, chatId: 900002 };
    response = await (0, index_1.handleGoal)({ ...femaleBase, userInput: '/goal' });
    assert(response.success, 'Expected second /goal to start successfully');
    response = await (0, index_1.handleGoal)({ ...femaleBase, userInput: '1' });
    assert(response.success, 'Expected female goal choice to advance');
    response = await (0, index_1.handleGoal)({ ...femaleBase, userInput: 'Female' });
    assert(response.success && response.message.toLowerCase().includes('activity'), 'Expected Female to ask activity');
    response = await (0, index_1.handleGoal)({ ...femaleBase, userInput: '3' });
    assert(response.success, 'Expected female activity step to advance');
    response = await (0, index_1.handleGoal)({ ...femaleBase, userInput: '32 165 60' });
    assert(response.success && response.data?.gender === 'female', 'Expected Female to be saved as female');
    console.log('All Nutrisaur agent tests passed');
}
runAllTests().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=agent.test.js.map