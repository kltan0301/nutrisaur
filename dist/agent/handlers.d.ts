import { AgentRequest, AgentResponse, LogsData, Meal, NutritionData, RecommendationData, SummaryData, UserGoal, UserRecord } from './types';
export declare function handleGoal(request: AgentRequest): Promise<AgentResponse<UserGoal | null>>;
export declare function handleLog(request: AgentRequest, image?: {
    data: string;
    mimeType: string;
}): Promise<AgentResponse<Meal | null>>;
export declare function handleAnalyze(request: AgentRequest, image?: {
    data: string;
    mimeType: string;
}): Promise<AgentResponse<NutritionData | null>>;
export declare function handleSummary(request: AgentRequest): Promise<AgentResponse<SummaryData>>;
export declare function handleLogs(request: AgentRequest): Promise<AgentResponse<LogsData>>;
export declare function handleEditLog(request: AgentRequest): Promise<AgentResponse<LogsData>>;
export declare function handleDeleteLog(userId: string, mealId: string): Promise<AgentResponse<Meal | null>>;
export declare function handleRecommend(request: AgentRequest): Promise<AgentResponse<RecommendationData | null>>;
export declare function handleStart(): Promise<AgentResponse<null>>;
export declare function handleHelp(): Promise<AgentResponse<null>>;
export declare function getUserRecord(request: AgentRequest): Promise<UserRecord>;
//# sourceMappingURL=handlers.d.ts.map