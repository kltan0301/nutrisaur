import { downloadTelegramFile } from '../services/telegram';
import { classifyIntent } from './classifier';
import {
  getUserRecord,
  handleAnalyze,
  handleGoal,
  handleHelp,
  handleLog,
  handleRecommend,
  handleSummary,
} from './handlers';
import { AgentRequest, AgentResponse, Intent } from './types';
import { logError } from '../middleware/logger';
import { nutritionStore } from './db';

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    const userInput = request.userInput?.trim() || '';
    const hasPhoto = Boolean(request.photo?.fileId);

    if (!userInput && !hasPhoto) {
      return {
        intent: Intent.HELP,
        success: false,
        data: null,
        message: 'Send a meal, photo, or /help.',
        timestamp: new Date().toISOString(),
        error: 'Empty input',
      };
    }

    const user = await getUserRecord(request);
    const intent = user.goalDraft && !userInput.startsWith('/') ? Intent.GOAL : classifyIntent(userInput, hasPhoto);
    const image = request.photo?.fileId ? await downloadTelegramFile(request.photo.fileId) : undefined;

    switch (intent) {
      case Intent.GOAL:
        return handleGoal(request);
      case Intent.LOG:
        return handleLog(request, image);
      case Intent.ANALYZE:
        return handleAnalyze(request, image);
      case Intent.SUMMARY:
        return handleSummary(request);
      case Intent.RECOMMEND:
        return handleRecommend(request);
      case Intent.HELP:
      default:
        return handleHelp();
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logError(new Error(errorMsg), 'runAgent');
    return {
      intent: Intent.HELP,
      success: false,
      data: null,
      message: 'Something went wrong while processing that. Please try again.',
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}

export { classifyIntent } from './classifier';
export { nutritionStore } from './db';
export { Intent } from './types';
export { handleAnalyze, handleGoal, handleHelp, handleLog, handleRecommend, handleSummary } from './handlers';
export type {
  ActivityLevel,
  AgentRequest,
  AgentResponse,
  Gender,
  GoalType,
  Meal,
  NutritionData,
  RecommendationData,
  SummaryData,
  UserGoal,
} from './types';
