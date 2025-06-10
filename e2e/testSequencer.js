const { default: TestSequencer } = require('@jest/test-sequencer');

class AlphabeticalSequencer extends TestSequencer {
  sort(tests) {
    // Sort tests alphabetically by their file path
    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;
      
      // Extract just the filename for comparison
      const filenameA = pathA.split('/').pop() || '';
      const filenameB = pathB.split('/').pop() || '';
      
      console.log(`Sorting: ${filenameA} vs ${filenameB}`);
      
      return filenameA.localeCompare(filenameB);
    });
  }
}

module.exports = AlphabeticalSequencer; 