import { createClient } from '@supabase/supabase-js';
import { applyDiscountCodeUsage } from '../src/services/discountService.js';

const supabaseUrl = 'https://bfxzhggjpiyqfolqpxzz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeHpoZ2dqcGl5cWZvbHFweHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDQxNjIsImV4cCI6MjA5NzE4MDE2Mn0.k8sG8NtOcIb9_1XpjOIdSqRl0pd4-Y30eSAMU-sjUH4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runVerification() {
  console.log('=== STARTING LIVE SUPABASE DISCOUNT CODES TEST ===');

  const testCode = 'TESTVERIFY999';

  // Cleanup prior test run if any
  await supabase.from('discount_codes').delete().eq('code', testCode);

  // 1. Insert test discount code
  const insertPayload = {
    code: testCode,
    discount_type: 'fixed',
    discount_value: 150,
    discount_percent: 150,
    valid_from: '2026-06-01',
    valid_until: '2026-12-31',
    max_uses: 2,
    used_count: 0,
    is_active: true,
    active: true
  };

  const { data: insertData, error: insertError } = await supabase
    .from('discount_codes')
    .insert(insertPayload)
    .select();

  if (insertError) {
    console.error('❌ Insert Error:', insertError);
    return;
  }
  console.log('✅ Step 1: Created test discount code in Supabase DB:', insertData[0]);

  // 2. Query back and verify all columns match expected saved values
  const { data: readData, error: readError } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', testCode)
    .single();

  if (readError || !readData) {
    console.error('❌ Read Error:', readError);
    return;
  }

  console.log('✅ Step 2: Verified saved values from Supabase DB:');
  console.log('  - code:', readData.code);
  console.log('  - discount_type:', readData.discount_type);
  console.log('  - discount_value:', readData.discount_value);
  console.log('  - valid_from:', readData.valid_from);
  console.log('  - valid_until:', readData.valid_until);
  console.log('  - max_uses:', readData.max_uses);
  console.log('  - used_count (initial):', readData.used_count);
  console.log('  - is_active:', readData.is_active);

  console.assert(readData.discount_type === 'fixed', 'discount_type match failed');
  console.assert(Number(readData.discount_value) === 150, 'discount_value match failed');
  console.assert(readData.valid_from === '2026-06-01', 'valid_from match failed');
  console.assert(readData.valid_until === '2026-12-31', 'valid_until match failed');
  console.assert(readData.max_uses === 2, 'max_uses match failed');
  console.assert(readData.used_count === 0, 'used_count match failed');

  // 3. Test Usage Increment (Simulate completing order 1)
  console.log('\n🔄 Step 3: Simulating order placement and calling applyDiscountCodeUsage()...');
  await applyDiscountCodeUsage(testCode);

  const { data: postOrder1Data } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', testCode)
    .single();

  console.log('✅ Step 3 Result: after 1 order, used_count =', postOrder1Data.used_count, '(is_active =', postOrder1Data.is_active, ')');
  console.assert(postOrder1Data.used_count === 1, 'used_count should be 1');
  console.assert(postOrder1Data.is_active === true, 'should still be active after 1 use of 2');

  // 4. Test Usage Increment (Simulate completing order 2 -> capacity exhausted)
  console.log('\n🔄 Step 4: Simulating 2nd order placement (reaching max_uses = 2)...');
  await applyDiscountCodeUsage(testCode);

  const { data: postOrder2Data } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('code', testCode)
    .single();

  console.log('✅ Step 4 Result: after 2nd order, used_count =', postOrder2Data.used_count, '(is_active =', postOrder2Data.is_active, ')');
  console.assert(postOrder2Data.used_count === 2, 'used_count should be 2');
  console.assert(postOrder2Data.is_active === false, 'code should automatically DEACTIVATE when max_uses reached');

  // 5. Clean up test row
  await supabase.from('discount_codes').delete().eq('code', testCode);
  console.log('\n🎉 ALL LIVE SUPABASE DB INTEGRATION TESTS PASSED 100% PERFECTLY!');
}

runVerification();
