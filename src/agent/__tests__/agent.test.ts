import { classifyIntent, handleGoal, Intent, nutritionStore } from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runAllTests(): Promise<void> {
  await nutritionStore.clear();

  assert(classifyIntent('/goal') === Intent.GOAL, 'Expected /goal to classify as GOAL');
  assert(classifyIntent('/log chicken rice') === Intent.LOG, 'Expected /log to classify as LOG');
  assert(classifyIntent('/analyse chicken rice') === Intent.ANALYZE, 'Expected /analyse to classify as ANALYZE');
  assert(classifyIntent('/summary by week') === Intent.SUMMARY, 'Expected /summary to classify as SUMMARY');
  assert(classifyIntent('/recommend hawker') === Intent.RECOMMEND, 'Expected /recommend to classify as RECOMMEND');
  assert(classifyIntent('I have eaten chicken rice') === Intent.LOG, 'Expected natural meal text to classify as LOG');

  const base = { userId: 123, chatId: 456 };
  let response = await handleGoal({ ...base, userInput: '/goal' });
  assert(response.success, 'Expected /goal to start successfully');

  response = await handleGoal({ ...base, userInput: '1' });
  assert(response.success && response.message.toLowerCase().includes('gender'), 'Expected goal step to ask gender');

  response = await handleGoal({ ...base, userInput: 'male' });
  assert(response.success && response.message.toLowerCase().includes('activity'), 'Expected gender step to ask activity');

  response = await handleGoal({ ...base, userInput: '3' });
  assert(response.success && response.message.toLowerCase().includes('age'), 'Expected activity step to ask body stats');

  response = await handleGoal({ ...base, userInput: '32 175 72' });
  assert(response.success && Boolean(response.data), 'Expected body stats to save a goal');

  console.log('All Nutrisaur agent tests passed');
}

runAllTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
