"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
async function runAllTests() {
    await index_1.nutritionStore.clear();
    assert((0, index_1.classifyIntent)('/goal') === index_1.Intent.GOAL, 'Expected /goal to classify as GOAL');
    assert((0, index_1.classifyIntent)('/log chicken rice') === index_1.Intent.LOG, 'Expected /log to classify as LOG');
    assert((0, index_1.classifyIntent)('/analyse chicken rice') === index_1.Intent.ANALYZE, 'Expected /analyse to classify as ANALYZE');
    assert((0, index_1.classifyIntent)('/summary by week') === index_1.Intent.SUMMARY, 'Expected /summary to classify as SUMMARY');
    assert((0, index_1.classifyIntent)('/recommend hawker') === index_1.Intent.RECOMMEND, 'Expected /recommend to classify as RECOMMEND');
    assert((0, index_1.classifyIntent)('I have eaten chicken rice') === index_1.Intent.LOG, 'Expected natural meal text to classify as LOG');
    const base = { userId: 123, chatId: 456 };
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
    console.log('All Nutrisaur agent tests passed');
}
runAllTests().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=agent.test.js.map