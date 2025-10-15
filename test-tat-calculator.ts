import {
  calculateTAT,
  dayTAT,
  hourTAT,
  specifyTAT,
  beforeTAT,
  formatDateIST,
  TATConfig
} from './server/tatCalculator';

// Test configuration - 8 hour workday
const testConfig: TATConfig = {
  officeStartHour: 9,  // 9 AM
  officeEndHour: 17,   // 5 PM (8 hours per day)
  timezone: "Asia/Kolkata",
  skipWeekends: true
};

// Helper function to format test results
function formatTestResult(
  testName: string,
  startTime: Date,
  endTime: Date,
  tatValue: number,
  tatType: string
) {
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));
  console.log(`TAT Type: ${tatType} | TAT Value: ${tatValue}`);
  console.log(`Start: ${startTime.toISOString()} (${dayOfWeek[startTime.getDay()]}) - ${formatDateIST(startTime)}`);
  console.log(`End:   ${endTime.toISOString()} (${dayOfWeek[endTime.getDay()]}) - ${formatDateIST(endTime)}`);
  
  // Check if end time is on weekend
  const isWeekend = endTime.getDay() === 0 || endTime.getDay() === 6;
  console.log(`Is End Date Weekend: ${isWeekend ? '❌ YES (Should be NO!)' : '✅ NO'}`);
  
  // Check if end time is within office hours
  const endHour = endTime.getHours();
  const withinOfficeHours = endHour >= testConfig.officeStartHour && endHour < testConfig.officeEndHour;
  console.log(`End Time Within Office Hours (${testConfig.officeStartHour}:00-${testConfig.officeEndHour}:00): ${withinOfficeHours ? '✅ YES' : '❌ NO (${endHour}:00 is outside)'}`);
  console.log(`End Hour: ${endHour}:${endTime.getMinutes().toString().padStart(2, '0')}`);
  
  // Calculate duration
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  console.log(`Duration: ${durationHours.toFixed(2)} hours (${durationDays.toFixed(2)} days)`);
}

console.log('\n🧪 TAT CALCULATOR COMPREHENSIVE TEST SUITE\n');
console.log(`Configuration: Office Hours ${testConfig.officeStartHour}:00 - ${testConfig.officeEndHour}:00 (8 hours per day)`);
console.log(`Skip Weekends: ${testConfig.skipWeekends ? 'YES' : 'NO'}`);
console.log(`⚠️  IMPORTANT: Hour TAT should be maximum 8 hours, otherwise use Day TAT\n`);

// ============================================================================
// TEST SCENARIO 1: DAY TAT
// ============================================================================
console.log('\n📅 TESTING DAY TAT');
console.log('─'.repeat(80));

// Test 1.1: Start on Friday afternoon, 2 days TAT (should skip weekend)
const friday2pm = new Date('2025-10-17T14:30:00+05:30'); // Friday 2:30 PM
const dayTat1 = dayTAT(friday2pm, 2, testConfig);
formatTestResult(
  'Day TAT: Friday 2:30 PM + 2 days (should land on Tuesday)',
  friday2pm,
  dayTat1,
  2,
  'Day'
);

// Test 1.2: Start on Thursday, 1 day TAT
const thursday10am = new Date('2025-10-16T10:00:00+05:30'); // Thursday 10:00 AM
const dayTat2 = dayTAT(thursday10am, 1, testConfig);
formatTestResult(
  'Day TAT: Thursday 10:00 AM + 1 day (should land on Friday)',
  thursday10am,
  dayTat2,
  1,
  'Day'
);

// Test 1.3: Start on Friday, 5 days TAT (should skip weekend)
const friday9am = new Date('2025-10-17T09:00:00+05:30'); // Friday 9:00 AM
const dayTat3 = dayTAT(friday9am, 5, testConfig);
formatTestResult(
  'Day TAT: Friday 9:00 AM + 5 days (should land on Friday next week)',
  friday9am,
  dayTat3,
  5,
  'Day'
);

// Test 1.4: Start on Saturday (weekend) + 1 day
const saturday11am = new Date('2025-10-18T11:00:00+05:30'); // Saturday 11:00 AM
const dayTat4 = dayTAT(saturday11am, 1, testConfig);
formatTestResult(
  'Day TAT: Saturday 11:00 AM + 1 day',
  saturday11am,
  dayTat4,
  1,
  'Day'
);

// ============================================================================
// TEST SCENARIO 2: HOUR TAT
// ============================================================================
console.log('\n⏰ TESTING HOUR TAT');
console.log('─'.repeat(80));

// Test 2.1: Start at 4 PM, 5 hours TAT (should roll to next day)
const thursday4pm = new Date('2025-10-16T16:00:00+05:30'); // Thursday 4:00 PM
const hourTat1 = hourTAT(thursday4pm, 5, testConfig);
formatTestResult(
  'Hour TAT: Thursday 4:00 PM + 5 hours (office ends at 6 PM, should continue next day)',
  thursday4pm,
  hourTat1,
  5,
  'Hour'
);

// Test 2.2: Start at 10 AM, 3 hours TAT (should finish same day)
const monday10am = new Date('2025-10-20T10:00:00+05:30'); // Monday 10:00 AM
const hourTat2 = hourTAT(monday10am, 3, testConfig);
formatTestResult(
  'Hour TAT: Monday 10:00 AM + 3 hours (should be 1:00 PM same day)',
  monday10am,
  hourTat2,
  3,
  'Hour'
);

// Test 2.3: Start on Friday 5 PM, 10 hours TAT (should skip weekend)
const friday5pm = new Date('2025-10-17T17:00:00+05:30'); // Friday 5:00 PM
const hourTat3 = hourTAT(friday5pm, 10, testConfig);
formatTestResult(
  'Hour TAT: Friday 5:00 PM + 10 hours (should skip weekend, land on Monday)',
  friday5pm,
  hourTat3,
  10,
  'Hour'
);

// Test 2.4: Start before office hours (7 AM), 2 hours TAT
const tuesday7am = new Date('2025-10-21T07:00:00+05:30'); // Tuesday 7:00 AM
const hourTat4 = hourTAT(tuesday7am, 2, testConfig);
formatTestResult(
  'Hour TAT: Tuesday 7:00 AM (before office) + 2 hours (should start from 9 AM)',
  tuesday7am,
  hourTat4,
  2,
  'Hour'
);

// Test 2.5: Start after office hours (8 PM), 4 hours TAT
const wednesday8pm = new Date('2025-10-22T20:00:00+05:30'); // Wednesday 8:00 PM
const hourTat5 = hourTAT(wednesday8pm, 4, testConfig);
formatTestResult(
  'Hour TAT: Wednesday 8:00 PM (after office) + 4 hours (should start next day at 9 AM)',
  wednesday8pm,
  hourTat5,
  4,
  'Hour'
);

// Test 2.6: Exactly 1 office day worth of hours (8 hours)
const thursday9am = new Date('2025-10-23T09:00:00+05:30'); // Thursday 9:00 AM
const hourTat6 = hourTAT(thursday9am, 8, testConfig);
formatTestResult(
  'Hour TAT: Thursday 9:00 AM + 8 hours (exactly 1 work day, should be Friday 9 AM)',
  thursday9am,
  hourTat6,
  8,
  'Hour'
);

// Test 2.7: Maximum hour TAT (8 hours) starting mid-day
const tuesday11am = new Date('2025-10-21T11:00:00+05:30'); // Tuesday 11:00 AM
const hourTat7 = hourTAT(tuesday11am, 8, testConfig);
formatTestResult(
  'Hour TAT: Tuesday 11:00 AM + 8 hours (should roll to Wednesday)',
  tuesday11am,
  hourTat7,
  8,
  'Hour'
);

// Test 2.8: 4 hours (half day)
const wednesday10am = new Date('2025-10-22T10:00:00+05:30'); // Wednesday 10:00 AM
const hourTat8 = hourTAT(wednesday10am, 4, testConfig);
formatTestResult(
  'Hour TAT: Wednesday 10:00 AM + 4 hours (should be 2:00 PM same day)',
  wednesday10am,
  hourTat8,
  4,
  'Hour'
);

// ============================================================================
// TEST SCENARIO 3: SPECIFY TAT
// ============================================================================
console.log('\n🎯 TESTING SPECIFY TAT');
console.log('─'.repeat(80));

// Test 3.1: Specify 10 AM next day from Wednesday
const wednesday3pm = new Date('2025-10-22T15:00:00+05:30'); // Wednesday 3:00 PM
const specifyTat1 = specifyTAT(wednesday3pm, 10, testConfig);
formatTestResult(
  'Specify TAT: Wednesday 3:00 PM, specify 10 AM next day (should be Thursday 10:00 AM)',
  wednesday3pm,
  specifyTat1,
  10,
  'Specify'
);

// Test 3.2: Specify 14 (2 PM) from Friday (should skip weekend)
const friday11am = new Date('2025-10-17T11:00:00+05:30'); // Friday 11:00 AM
const specifyTat2 = specifyTAT(friday11am, 14, testConfig);
formatTestResult(
  'Specify TAT: Friday 11:00 AM, specify 2 PM next day (should be Monday 2:00 PM)',
  friday11am,
  specifyTat2,
  14,
  'Specify'
);

// Test 3.3: Specify 16 (4 PM) from Thursday
const thursday1pm = new Date('2025-10-16T13:00:00+05:30'); // Thursday 1:00 PM
const specifyTat3 = specifyTAT(thursday1pm, 16, testConfig);
formatTestResult(
  'Specify TAT: Thursday 1:00 PM, specify 4 PM next day (should be Friday 4:00 PM)',
  thursday1pm,
  specifyTat3,
  16,
  'Specify'
);

// ============================================================================
// TEST SCENARIO 4: BEFORE TAT
// ============================================================================
console.log('\n⏮️ TESTING BEFORE TAT');
console.log('─'.repeat(80));

// Test 4.1: Go back 2 days from Tuesday
const tuesday2pm = new Date('2025-10-21T14:00:00+05:30'); // Tuesday 2:00 PM
const beforeTat1 = beforeTAT(tuesday2pm, 2, testConfig);
formatTestResult(
  'Before TAT: Tuesday 2:00 PM - 2 days (should skip weekend, land on Friday)',
  tuesday2pm,
  beforeTat1,
  2,
  'Before'
);

// Test 4.2: Go back 1 day from Monday (should skip weekend)
const monday3pm = new Date('2025-10-20T15:00:00+05:30'); // Monday 3:00 PM
const beforeTat2 = beforeTAT(monday3pm, 1, testConfig);
formatTestResult(
  'Before TAT: Monday 3:00 PM - 1 day (should be Friday)',
  monday3pm,
  beforeTat2,
  1,
  'Before'
);

// ============================================================================
// TEST SCENARIO 5: HOUR TAT vs DAY TAT COMPARISON
// ============================================================================
console.log('\n📊 COMPARISON: HOUR TAT vs DAY TAT (When to use which?)');
console.log('─'.repeat(80));

// Comparison 1: 8 hours using Hour TAT vs 1 Day using Day TAT
const comparisonStart1 = new Date('2025-10-20T09:00:00+05:30'); // Monday 9:00 AM
const comp1Hour = hourTAT(comparisonStart1, 8, testConfig);
const comp1Day = dayTAT(comparisonStart1, 1, testConfig);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON 1: 8 Hours vs 1 Day from Monday 9:00 AM');
console.log('='.repeat(80));
console.log(`Start: Monday 9:00 AM`);
console.log(`Hour TAT (8 hours): ${comp1Hour.toISOString()} - ${formatDateIST(comp1Hour)}`);
console.log(`Day TAT (1 day):    ${comp1Day.toISOString()} - ${formatDateIST(comp1Day)}`);
console.log(`Result: ${comp1Hour.getTime() === comp1Day.getTime() ? '✅ SAME' : '⚠️ DIFFERENT'}`);

// Comparison 2: 16 hours vs 2 days
const comparisonStart2 = new Date('2025-10-21T10:00:00+05:30'); // Tuesday 10:00 AM
const comp2Hour = hourTAT(comparisonStart2, 16, testConfig);
const comp2Day = dayTAT(comparisonStart2, 2, testConfig);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON 2: 16 Hours vs 2 Days from Tuesday 10:00 AM');
console.log('='.repeat(80));
console.log(`Start: Tuesday 10:00 AM`);
console.log(`Hour TAT (16 hours): ${comp2Hour.toISOString()} - ${formatDateIST(comp2Hour)}`);
console.log(`Day TAT (2 days):    ${comp2Day.toISOString()} - ${formatDateIST(comp2Day)}`);
console.log(`Result: ${comp2Hour.getTime() === comp2Day.getTime() ? '✅ SAME' : '⚠️ DIFFERENT'}`);

// Comparison 3: What if user wants more than 8 hours?
console.log('\n' + '='.repeat(80));
console.log('COMPARISON 3: More than 8 hours - Should use Day TAT');
console.log('='.repeat(80));
const comparisonStart3 = new Date('2025-10-22T11:30:00+05:30'); // Wednesday 11:30 AM

console.log(`\n📌 Scenario: User wants 12 hours TAT from Wednesday 11:30 AM`);
console.log(`Recommendation: Use Day TAT (2 days) instead of Hour TAT (12 hours)`);
console.log(`Reason: Office hours are only 8 hours per day (9 AM - 5 PM)\n`);

const wrongApproach = hourTAT(comparisonStart3, 12, testConfig);
const rightApproach = dayTAT(comparisonStart3, 2, testConfig);

console.log(`❌ Hour TAT (12 hours): ${wrongApproach.toISOString()} - ${formatDateIST(wrongApproach)}`);
console.log(`✅ Day TAT (2 days):    ${rightApproach.toISOString()} - ${formatDateIST(rightApproach)}`);

// ============================================================================
// TEST SCENARIO 6: EDGE CASES & COMBINED TESTS
// ============================================================================
console.log('\n🔥 TESTING EDGE CASES');
console.log('─'.repeat(80));

// Test 5.1: Start on Sunday
const sunday2pm = new Date('2025-10-19T14:00:00+05:30'); // Sunday 2:00 PM
const edgeTat1 = hourTAT(sunday2pm, 3, testConfig);
formatTestResult(
  'Edge Case: Sunday 2:00 PM + 3 hours (should jump to Monday and apply hours)',
  sunday2pm,
  edgeTat1,
  3,
  'Hour'
);

// Test 5.2: Very long hour TAT crossing multiple days and weekend
const wednesday2pm = new Date('2025-10-15T14:00:00+05:30'); // Wednesday 2:00 PM
const edgeTat2 = hourTAT(wednesday2pm, 20, testConfig);
formatTestResult(
  'Edge Case: Wednesday 2:00 PM + 20 hours (2.5 days worth, should skip weekend)',
  wednesday2pm,
  edgeTat2,
  20,
  'Hour'
);

// Test 5.3: Day TAT starting from Saturday
const saturday2pm = new Date('2025-10-18T14:00:00+05:30'); // Saturday 2:00 PM
const edgeTat3 = dayTAT(saturday2pm, 3, testConfig);
formatTestResult(
  'Edge Case: Saturday 2:00 PM + 3 days (should skip Saturday/Sunday)',
  saturday2pm,
  edgeTat3,
  3,
  'Day'
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n\n' + '='.repeat(80));
console.log('TEST SUMMARY & RECOMMENDATIONS');
console.log('='.repeat(80));
console.log('✅ Check if all end dates avoid weekends (when skipWeekends is true)');
console.log('✅ Check if all end times are within office hours (9 AM - 5 PM)');
console.log('✅ Check if calculations properly handle Friday -> Monday transitions');
console.log('✅ Check if hour TAT doesn\'t extend beyond office hours on same day');
console.log('✅ Check if specify TAT sets the correct hour on next working day');
console.log('');
console.log('📌 USAGE GUIDELINES:');
console.log('   • Hour TAT: Use for tasks ≤ 8 hours (same day or next day)');
console.log('   • Day TAT: Use for tasks > 8 hours or multi-day tasks');
console.log('   • Office Hours: 9:00 AM - 5:00 PM (8 hours per day)');
console.log('   • Weekends: Automatically skipped');
console.log('='.repeat(80));
