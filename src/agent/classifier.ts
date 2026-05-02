import { Intent } from './types';

export function classifyIntent(userInput: string, hasPhoto = false): Intent {
  const input = (userInput || '').trim().toLowerCase();

  if (input.startsWith('/goal')) return Intent.GOAL;
  if (input.startsWith('/log')) return Intent.LOG;
  if (input.startsWith('/analyse') || input.startsWith('/analyze')) return Intent.ANALYZE;
  if (input.startsWith('/summary')) return Intent.SUMMARY;
  if (input.startsWith('/recommend')) return Intent.RECOMMEND;
  if (input.startsWith('/start') || input.startsWith('/help')) return Intent.HELP;

  if (hasPhoto) return Intent.ANALYZE;
  if (/\b(i ate|i have eaten|today i ate|just ate|had|consumed)\b/i.test(input)) return Intent.LOG;
  if (/\b(summary|recap|today|this week|this month|total)\b/i.test(input)) return Intent.SUMMARY;
  if (/\b(calories|nutrition|protein|carbs|fat|sugar|analyse|analyze|estimate)\b/i.test(input)) return Intent.ANALYZE;

  return Intent.LOG;
}
