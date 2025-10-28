// Simple test to verify range quantity handling
const { multiplyQuantity, parseFraction, formatFractionWithUnicode } = require('./src/lib/fraction-utils.ts');

// Test cases for range quantities
const testCases = [
  // Range formats
  { input: '1-2', multiplier: 2, expectedType: 'range' },
  { input: '1 to 2', multiplier: 1.5, expectedType: 'range' },
  { input: '1½-2', multiplier: 2, expectedType: 'range' },
  { input: '1/2 to 3/4', multiplier: 2, expectedType: 'range' },
  { input: '2-3 cups', multiplier: 2, expectedType: 'range' },
  
  // Regular quantities (should work as before)
  { input: '1', multiplier: 2, expected: '2' },
  { input: '1/2', multiplier: 2, expected: '1' },
  { input: '1 1/2', multiplier: 2, expected: '3' },
  { input: '2.5', multiplier: 2, expected: '5' },
];

console.log('Testing range quantity handling:\n');

testCases.forEach((testCase, index) => {
  try {
    const result = multiplyQuantity(testCase.input, testCase.multiplier);
    const parsed = parseFraction(testCase.input);
    const formatted = formatFractionWithUnicode(result);
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: "${testCase.input}" × ${testCase.multiplier}`);
    console.log(`  Parsed value: ${parsed}`);
    console.log(`  Result: "${result}"`);
    console.log(`  Formatted: "${formatted}"`);
    
    if (testCase.expected && result !== testCase.expected) {
      console.log(`  ❌ Expected: "${testCase.expected}"`);
    } else if (testCase.expectedType === 'range' && !result.includes('-') && !result.includes('to')) {
      console.log(`  ⚠️  Expected range format`);
    } else {
      console.log(`  ✅ Passed`);
    }
    console.log('');
  } catch (error) {
    console.log(`Test ${index + 1}: ❌ Error - ${error.message}\n`);
  }
});