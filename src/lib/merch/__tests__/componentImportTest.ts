/**
 * Simple test to verify merch analytics components can be imported
 * Run with: node --loader tsx src/lib/merch/__tests__/componentImportTest.ts
 */

console.log('Testing merch analytics component imports...\n');

try {
  // Test analytics components import
  console.log('✓ Testing components import...');
  import('../../../components/merch/analytics/index').then(() => {
    console.log('✓ Components import successful');
  }).catch(err => {
    console.error('✗ Components import failed:', err.message);
  });

  // Test backend imports
  console.log('✓ Testing backend imports...');
  Promise.all([
    import('../types'),
    import('../constants'),
    import('../normalizeMerchItem'),
    import('../buildMerchAnalytics'),
    import('../buildRecommendations'),
    import('../tourLoadout'),
    import('../exportCsv'),
  ]).then(() => {
    console.log('✓ All backend imports successful\n');
    console.log('🎉 All imports working correctly!');
  }).catch(err => {
    console.error('✗ Backend import failed:', err.message);
  });

} catch (error) {
  console.error('✗ Test failed:', error);
  process.exit(1);
}
