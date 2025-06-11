const path = require('path');

/**
 * Custom path builder for Detox artifacts
 * Organizes screenshots and other artifacts by test suite and test name
 */
class CustomPathBuilder {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  buildPathForTestArtifact(artifactName, testSummary) {
    const { 
      suite = 'unknown-suite',
      title = 'unknown-test',
      fullName = title,
      status = 'unknown'
    } = testSummary || {};

    // Clean up suite and test names for file system
    const cleanSuite = this.sanitizeFilename(suite);
    const cleanTest = this.sanitizeFilename(title);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Organize by status (passed/failed) and suite
    const statusDir = status === 'failed' ? 'failed-tests' : 'passed-tests';
    const suiteDir = cleanSuite || 'misc';
    
    // Create descriptive filename with timestamp
    const artifactBasename = path.basename(artifactName);
    const artifactExtension = path.extname(artifactBasename);
    const artifactNameWithoutExt = path.basename(artifactBasename, artifactExtension);
    
    const finalName = `${cleanTest}_${timestamp}_${artifactNameWithoutExt}${artifactExtension}`;
    
    return path.join(this.rootDir, statusDir, suiteDir, finalName);
  }

  buildPathForTestVideo(videoName, testSummary) {
    return this.buildPathForTestArtifact(videoName, testSummary);
  }

  buildPathForTestScreenshot(screenshotName, testSummary) {
    return this.buildPathForTestArtifact(screenshotName, testSummary);
  }

  buildPathForTestLog(logName, testSummary) {
    return this.buildPathForTestArtifact(logName, testSummary);
  }

  // Fallback for any other artifacts
  buildPathForArtifact(artifactName, testSummary) {
    return this.buildPathForTestArtifact(artifactName, testSummary);
  }

  sanitizeFilename(name) {
    if (!name) return 'unknown';
    
    // Replace problematic characters with underscores
    return name
      .replace(/[^a-zA-Z0-9\-_\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
      .substring(0, 50); // Limit length
  }
}

module.exports = CustomPathBuilder; 