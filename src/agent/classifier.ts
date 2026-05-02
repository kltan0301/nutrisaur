import { Intent } from './types';

function isCommand(input: string, command: string): boolean {
  return new RegExp(`^/${command}(?:@\\w+)?(?:\\s|$)`, 'i').test(input);
}

export function classifyIntent(userInput: string, hasPhoto = false): Intent {
  const input = (userInput || '').trim().toLowerCase();

  if (isCommand(input, 'goal_remind')) return Intent.GOAL_REMIND;
  if (isCommand(input, 'goal')) return Intent.GOAL;
  if (isCommand(input, 'edit_log')) return Intent.EDIT_LOG;
  if (isCommand(input, 'logs')) return Intent.LOGS;
  if (isCommand(input, 'log')) return Intent.LOG;
  if (isCommand(input, 'analyse') || isCommand(input, 'analyze')) return Intent.ANALYZE;
  if (isCommand(input, 'summary')) return Intent.SUMMARY;
  if (isCommand(input, 'calories_remaining')) return Intent.CALORIES_REMAINING;
  if (isCommand(input, 'recommend')) return Intent.RECOMMEND;
  if (isCommand(input, 'start')) return Intent.START;
  if (isCommand(input, 'help')) return Intent.HELP;

  if (input.startsWith('/')) return Intent.HELP;

  if (hasPhoto) return Intent.ANALYZE;
  if (/\b(i ate|i have eaten|today i ate|just ate|had|consumed)\b/i.test(input)) return Intent.LOG;
  if (/\b(summary|recap|today|this week|this month|total)\b/i.test(input)) return Intent.SUMMARY;
  if (/\b(calories|nutrition|protein|carbs|fat|sugar|analyse|analyze|estimate)\b/i.test(input)) return Intent.ANALYZE;

  return Intent.LOG;
}
