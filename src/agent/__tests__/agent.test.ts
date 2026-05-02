import { classifyIntent, handleGoal, Intent, nutritionStore } from '../index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runAllTests(): Promise<void> {
  assert(classifyIntent('/goal') === Intent.GOAL, 'Expected /goal to classify as GOAL');
  assert(classifyIntent('/goal_remind') === Intent.GOAL_REMIND, 'Expected /goal_remind to classify as GOAL_REMIND');
  assert(classifyIntent('/start') === Intent.START, 'Expected /start to classify as START');
  assert(classifyIntent('/help') === Intent.HELP, 'Expected /help to classify as HELP');
  assert(classifyIntent('/edit_log today') === Intent.EDIT_LOG, 'Expected /edit_log to classify as EDIT_LOG');
  assert(classifyIntent('/logs today') === Intent.LOGS, 'Expected /logs to classify as LOGS');
  assert(classifyIntent('/log chicken rice') === Intent.LOG, 'Expected /log to classify as LOG');
  assert(classifyIntent('/analyse chicken rice') === Intent.ANALYZE, 'Expected /analyse to classify as ANALYZE');
  assert(classifyIntent('/summary by week') === Intent.SUMMARY, 'Expected /summary to classify as SUMMARY');
  assert(classifyIntent('/calories_remaining') === Intent.CALORIES_REMAINING, 'Expected /calories_remaining to classify as CALORIES_REMAINING');
  assert(classifyIntent('/recommend hawker') === Intent.RECOMMEND, 'Expected /recommend to classify as RECOMMEND');
  assert(classifyIntent('I have eaten chicken rice') === Intent.LOG, 'Expected natural meal text to classify as LOG');

  const base = { userId: 900001, chatId: 900001 };
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
  assert(response.data?.gender === 'male', 'Expected male to be saved as male');

  const femaleBase = { userId: 900002, chatId: 900002 };
  response = await handleGoal({ ...femaleBase, userInput: '/goal' });
  assert(response.success, 'Expected second /goal to start successfully');

  response = await handleGoal({ ...femaleBase, userInput: '1' });
  assert(response.success, 'Expected female goal choice to advance');

  response = await handleGoal({ ...femaleBase, userInput: 'Female' });
  assert(response.success && response.message.toLowerCase().includes('activity'), 'Expected Female to ask activity');

  response = await handleGoal({ ...femaleBase, userInput: '3' });
  assert(response.success, 'Expected female activity step to advance');

  response = await handleGoal({ ...femaleBase, userInput: '32 165 60' });
  assert(response.success && response.data?.gender === 'female', 'Expected Female to be saved as female');

  console.log('All Nutrisaur agent tests passed');
}

runAllTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
