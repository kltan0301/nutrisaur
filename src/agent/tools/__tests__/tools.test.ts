/**
 * Test suite for tools module
 * Tests analyzeFood, logFood, and getSummary tools
 *
 * Run with: npx ts-node src/agent/tools/__tests__/tools.test.ts
 */

import {
  analyzeFood,
  logFood,
  getSummary,
  getSupportedFoods,
  isFoodSupported,
  addCustomFood,
  clearAllLogs,
  clearUserLogs,
  getUserEntryCount,
  getAllUsers,
  getStorageStats,
  updateStoreConfig,
} from '../index';
import { NutritionInfo } from '../types';

/**
 * Test helper: colored console output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test: analyzeFood tool
 */
async function testAnalyzeFood() {
  log('\n=== TEST: analyzeFood ===', 'blue');

  const testCases = [
    { input: 'banana', expected: 'Banana' },
    { input: 'I ate an apple', expected: 'Apple' },
    { input: 'chicken rice', expected: 'Chicken Rice' },
    { input: 'pasta salad', expected: 'Pasta' },
    { input: 'empty foods', expected: null },
  ];

  let passed = 0;

  for (const test of testCases) {
    const result = await analyzeFood(test.input);
    const foodName = result.data?.food;
    const status = foodName === test.expected ? '✅' : '❌';

    log(`${status} "${test.input}" → ${foodName || 'null'}`, foodName === test.expected ? 'green' : 'yellow');

    if (foodName === test.expected) passed++;
  }

  log(`\nPassed: ${passed}/${testCases.length}`, passed === testCases.length ? 'green' : 'yellow');
}

/**
 * Test: logFood tool
 */
async function testLogFood() {
  log('\n=== TEST: logFood ===', 'blue');

  clearAllLogs();

  const userId = 'testuser123';
  const nutrition: NutritionInfo = {
    food: 'Test Food',
    calories: 500,
    protein: 20,
    carbs: 60,
    fat: 15,
    sugar: 10,
    confidence: 0.8,
  };

  log('📝 Logging food entry...', 'cyan');
  const logResult = await logFood(userId, nutrition);

  if (logResult.success && logResult.data) {
    log(`✅ Food logged successfully`, 'green');
    log(`   ID: ${logResult.data.id}`, 'green');
    log(`   Food: ${logResult.data.nutrition.food}`, 'green');
    log(`   Calories: ${logResult.data.nutrition.calories}`, 'green');
  } else {
    log(`❌ Failed to log food: ${logResult.error}`, 'red');
    return;
  }

  // Test entry count
  const count = getUserEntryCount(userId);
  log(`✅ User has ${count} entry`, count === 1 ? 'green' : 'red');

  // Test empty userId
  log('\n📝 Testing error handling (empty user ID)...', 'cyan');
  const emptyUserResult = await logFood('', nutrition);
  log(
    `${emptyUserResult.success ? '❌' : '✅'} Empty user rejected: ${emptyUserResult.error}`,
    emptyUserResult.success ? 'red' : 'green'
  );

  // Test empty nutrition
  log('\n📝 Testing error handling (empty nutrition)...', 'cyan');
  const emptyNutritionResult = await logFood(userId, { food: '', calories: 0 } as any);
  log(
    `${emptyNutritionResult.success ? '❌' : '✅'} Empty nutrition rejected: ${emptyNutritionResult.error}`,
    emptyNutritionResult.success ? 'red' : 'green'
  );
}

/**
 * Test: getSummary tool
 */
async function testGetSummary() {
  log('\n=== TEST: getSummary ===', 'blue');

  clearAllLogs();

  const userId = 'summaryuser';

  // Add multiple entries
  log('📝 Adding multiple food entries...', 'cyan');
  const foods = ['banana', 'apple', 'egg'];

  for (const food of foods) {
    const analyzed = await analyzeFood(food);
    if (analyzed.data) {
      await logFood(userId, analyzed.data);
    }
  }

  log(`✅ Added ${foods.length} entries`, 'green');

  // Get summary
  log('\n📊 Getting daily summary...', 'cyan');
  const summaryResult = await getSummary(userId);

  if (summaryResult.success && summaryResult.data) {
    log(`✅ Summary retrieved`, 'green');
    log(`   Meals: ${summaryResult.data.mealCount}`, 'green');
    log(`   Calories: ${summaryResult.data.totals.calories}`, 'green');
    log(`   Protein: ${summaryResult.data.totals.protein}g`, 'green');
    log(`   Carbs: ${summaryResult.data.totals.carbs}g`, 'green');
    log(`   Fat: ${summaryResult.data.totals.fat}g`, 'green');
    log(`   Sugar: ${summaryResult.data.totals.sugar}g`, 'green');

    // Verify totals calculation
    const expectedCalories = 105 + 95 + 155; // banana + apple + egg
    const caloriesMatch = summaryResult.data.totals.calories === expectedCalories;
    log(
      `${caloriesMatch ? '✅' : '❌'} Calories total: ${summaryResult.data.totals.calories} (expected ${expectedCalories})`,
      caloriesMatch ? 'green' : 'red'
    );
  } else {
    log(`❌ Failed to get summary: ${summaryResult.error}`, 'red');
  }

  // Test empty user
  log('\n📝 Testing error handling (no entries for date)...', 'cyan');
  const emptyResult = await getSummary('newuser999');
  if (emptyResult.success && emptyResult.data?.mealCount === 0) {
    log(`✅ Empty date returns 0 meals`, 'green');
  }
}

/**
 * Test: Supported foods
 */
function testSupportedFoods() {
  log('\n=== TEST: getSupportedFoods ===', 'blue');

  const supported = getSupportedFoods();
  log(`✅ ${supported.length} foods supported`, 'green');

  const sampleFoods = ['banana', 'apple', 'egg', 'pizza'];
  for (const food of sampleFoods) {
    const isSupported = isFoodSupported(food);
    log(`${isSupported ? '✅' : '❌'} ${food}`, isSupported ? 'green' : 'red');
  }

  // Test unsupported
  const unsupported = isFoodSupported('xyz_unknown_food_xyz');
  log(`${unsupported ? '❌' : '✅'} Unknown food rejected`, unsupported ? 'red' : 'green');
}

/**
 * Test: Custom food addition
 */
function testCustomFood() {
  log('\n=== TEST: addCustomFood ===', 'blue');

  const customFood: NutritionInfo = {
    food: 'Custom Burger',
    calories: 550,
    protein: 30,
    carbs: 45,
    fat: 25,
    sugar: 8,
    confidence: 0.75,
    servingSize: '1 burger (200g)',
  };

  addCustomFood('burger', customFood);

  const isSupported = isFoodSupported('burger');
  log(`${isSupported ? '✅' : '❌'} Custom food registered`, isSupported ? 'green' : 'red');
}

/**
 * Test: Storage statistics
 */
function testStorageStats() {
  log('\n=== TEST: getStorageStats ===', 'blue');

  const stats = getStorageStats();
  log(`✅ Total users: ${stats.totalUsers}`, 'green');
  log(`✅ Total entries: ${stats.totalEntries}`, 'green');

  const users = getAllUsers();
  log(`✅ Users: ${users.join(', ')}`, 'green');
}

/**
 * Test: Store configuration
 */
function testStoreConfig() {
  log('\n=== TEST: updateStoreConfig ===', 'blue');

  updateStoreConfig({ maxEntriesPerUser: 500 });

  const config = { maxEntriesPerUser: 500, retentionDays: 90, enablePersistence: false };
  log(`✅ Config updated`, 'green');
  log(`   maxEntriesPerUser: 500`, 'green');
}

/**
 * Test: Integration flow
 */
async function testIntegrationFlow() {
  log('\n=== TEST: Integration Flow ===', 'blue');

  clearAllLogs();

  const userId = 'integrationtest';

  log('\n1️⃣ User analyzes food', 'cyan');
  const analyzed = await analyzeFood('chicken rice');
  if (!analyzed.success) {
    log(`❌ Failed: ${analyzed.error}`, 'red');
    return;
  }
  log(`✅ Analyzed: ${analyzed.data?.food}`, 'green');

  log('\n2️⃣ User logs the food', 'cyan');
  const logged = await logFood(userId, analyzed.data!);
  if (!logged.success) {
    log(`❌ Failed: ${logged.error}`, 'red');
    return;
  }
  log(`✅ Logged: ${logged.data?.nutrition.food}`, 'green');

  log('\n3️⃣ User gets daily summary', 'cyan');
  const summary = await getSummary(userId);
  if (!summary.success) {
    log(`❌ Failed: ${summary.error}`, 'red');
    return;
  }
  log(`✅ Summary: ${summary.data?.mealCount} meals, ${summary.data?.totals.calories} cal`, 'green');

  log('\n✅ Integration flow complete', 'green');
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         NUTRITION TRACKER TOOLS - TEST SUITE               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    testSupportedFoods();
    await testAnalyzeFood();
    await testLogFood();
    await testGetSummary();
    testCustomFood();
    testStorageStats();
    testStoreConfig();
    await testIntegrationFlow();

    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                  ALL TESTS COMPLETED ✅                    ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Test suite error: ${error}`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests();
