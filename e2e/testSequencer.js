const { default: TestSequencer } = require('@jest/test-sequencer');

class IndependentTestSequencer extends TestSequencer {
  constructor() {
    super();
    
    // All tests are now independent and can run in parallel
    // Just maintain alphabetical order for consistency
    this.testOrder = [
      '00_firstTest.test.ts',
      '01_onboardingFlow.test.ts', 
      '02_importWalletFlow.test.ts',
      '03_loadCardFlow.test.ts'
    ];
  }

  sort(tests) {
    console.log('🚀 Sorting tests for maximum parallel execution...');
    
    // Sort all tests alphabetically - they can all run in parallel
    const sortedTests = tests.sort((a, b) => {
      const filenameA = this.getFilename(a.path);
      const filenameB = this.getFilename(b.path);
      
      // Use predefined order if available, otherwise alphabetical
      const indexA = this.testOrder.indexOf(filenameA);
      const indexB = this.testOrder.indexOf(filenameB);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      } else if (indexA !== -1) {
        return -1;
      } else if (indexB !== -1) {
        return 1;
      } else {
      return filenameA.localeCompare(filenameB);
      }
    });
    
    console.log('📋 Test execution plan (all parallel):');
    sortedTests.forEach(test => {
      console.log(`  🔄 ${this.getFilename(test.path)} (independent)`);
    });
    
    console.log(`✅ ${sortedTests.length} tests ready for parallel execution`);
    
    return sortedTests;
  }
  
  getFilename(path) {
    return path.split('/').pop() || '';
  }
}

module.exports = IndependentTestSequencer; 