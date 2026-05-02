# Agent System - Quick Reference

## TL;DR

A production-ready Telegram bot agent that classifies user messages into **LOG** (log meal), **ANALYZE** (nutrition question), or **SUMMARY** (get stats) and routes to appropriate handlers.

## File Locations

```
src/agent/
├── types.ts              Interface definitions
├── classifier.ts         Intent detection (keyword patterns)
├── db.ts                 Mock in-memory database
├── handlers.ts           LOG/ANALYZE/SUMMARY implementations
├── index.ts              Agent orchestrator (main entry)
└── __tests__/
    └── agent.test.ts     Test suite
```

## Running

```bash
npm start                                    # Start server
npm run dev                                  # Dev with hot reload
npx ts-node src/agent/__tests__/agent.test.ts  # Run tests
npm run build                                # Build TypeScript
```

## Usage

```typescript
import { runAgent } from './src/agent';

const response = await runAgent({
  userInput: 'I ate chicken rice',
  userId: 123,
  chatId: 456,
});

console.log(response.intent);    // "LOG"
console.log(response.success);   // true
console.log(response.message);   // "✅ Meal logged: Chicken Rice (600 cal)"
console.log(response.data);      // { id, food, nutrition, timestamp }
```

## Intent Types

| Intent | Keywords | Handler Does |
|--------|----------|--------------|
| **LOG** | ate, had, consumed, log, record, save | Estimates nutrition, stores meal |
| **ANALYZE** | analyze, check, what, calories, nutrition, info | Estimates nutrition, returns data |
| **SUMMARY** | today, week, month, summary, recap, total | Queries database, aggregates totals |

## Response Structure

```typescript
interface AgentResponse<T> {
  intent: 'LOG' | 'ANALYZE' | 'SUMMARY';
  success: boolean;
  data: T | null;
  message: string;           // User-friendly message
  timestamp: string;         // ISO 8601
  error?: string;            // Error message if success=false
}
```

## Handler Examples

### LOG Handler
```typescript
Input:  "I ate chicken rice"
Output: {
  intent: 'LOG',
  success: true,
  data: { id: 'meal_...', food: 'Chicken Rice', nutrition: {...} },
  message: '✅ Meal logged: Chicken Rice (600 cal)'
}
```

### ANALYZE Handler
```typescript
Input:  "How many calories in an apple?"
Output: {
  intent: 'ANALYZE',
  success: true,
  data: { food: 'Apple', calories: 95, protein: 0.5, carbs: 25, ... },
  message: '📊 Nutrition Analysis: Apple\n🔥 95 cal | 🥩 0.5g protein ...'
}
```

### SUMMARY Handler
```typescript
Input:  "Show me today"
Output: {
  intent: 'SUMMARY',
  success: true,
  data: {
    range: { period: 'today', startDate, endDate },
    totals: { calories: 955, protein: 39.8, carbs: 133.1, ... },
    meals: [{ food: 'Chicken Rice', calories: 600 }, ...]
  },
  message: '📈 Summary for TODAY:\n🍽️ Meals: 2\n🔥 955 cal ...'
}
```

## Classification Examples

```
"I ate chicken rice"         → LOG
"I just had a banana"        → LOG
"What are the calories?"     → ANALYZE
"Analyze the nutrition"      → ANALYZE
"Show me my summary"         → SUMMARY
"Last week recap"            → SUMMARY
```

## Mock Nutrition Database

Includes: banana, apple, egg, chicken rice, pasta, salad, pizza

Falls back to Gemini API if available, then mock database.

## Testing

```bash
npx ts-node src/agent/__tests__/agent.test.ts
```

**Tests Cover:**
- ✅ Intent classification (6 cases)
- ✅ Database operations
- ✅ Error handling (empty input, whitespace)
- ✅ Agent routing (all 3 intents)

## Database

```typescript
mealDB.add(meal)                           // Store meal
mealDB.getByDateRange(start, end)         // Query by dates
mealDB.getAll()                           // Get all meals
mealDB.clear()                            // Reset (testing only)
```

## Design Principles

✅ **Explicit** - No magic, clear routing  
✅ **Type-Safe** - Full TypeScript  
✅ **Testable** - Pure functions, mocked deps  
✅ **Minimal** - No frameworks  
✅ **Resilient** - Graceful error handling  
✅ **Fast** - Mock DB for instant responses  

## Architecture Flow

```
User Input
    ↓
Classify Intent (keyword scoring)
    ↓
Route to Handler (LOG/ANALYZE/SUMMARY)
    ↓
Execute Logic (estimate nutrition, store, aggregate)
    ↓
Return Structured Response
    ↓
Webhook logs response
```

## Integration with Webhook

The agent is automatically called from `src/routes/webhook.ts`:

```typescript
const agentResponse = await runAgent({
  userInput: messageText,
  userId: logEntry.userId,
  chatId: logEntry.chatId,
});
```

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| types.ts | ~100 | Interfaces |
| classifier.ts | ~100 | Intent detection |
| db.ts | ~80 | Database |
| handlers.ts | ~280 | Business logic |
| index.ts | ~70 | Orchestrator |
| __tests__/agent.test.ts | ~200 | Tests |

## Production Notes

- Replace mock DB with real database (SQLite/PostgreSQL)
- Verify Gemini API key permissions
- Add rate limiting
- Add user authentication
- Set up error tracking
- Monitor nutrition estimates
- Cache common foods

## Docs

- **AGENT_README.md** - Complete documentation
- **WEBHOOK_README.md** - Webhook setup guide

---

**Production-ready, test-driven, framework-free agent system. 🚀**
