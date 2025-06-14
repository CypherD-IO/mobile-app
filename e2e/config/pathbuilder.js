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
    
    // Sanitize the artifact name as well
    const cleanArtifactName = this.sanitizeFilename(artifactNameWithoutExt);
    
    const finalName = `${cleanTest}_${timestamp}_${cleanArtifactName}${artifactExtension}`;
    
    // Double-check the final path for any remaining invalid characters
    const finalPath = path.join(this.rootDir, statusDir, suiteDir, finalName);
    const safePath = this.sanitizePath(finalPath);
    
    // Debug logging to see what paths are being generated
    if (process.env.CI) {
      console.log(`[PathBuilder] Original artifact: ${artifactName}`);
      console.log(`[PathBuilder] Generated path: ${safePath}`);
    }
    
    return safePath;
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
    
    // Replace all GitHub Actions artifact invalid characters with underscores
    // Invalid: " : < > | * ? \r \n and other problematic characters
    return name
      .replace(/[<>:"|\*\?\r\n]/g, '_')  // Replace invalid characters with underscores
      .replace(/[^a-zA-Z0-9\-_\s\.]/g, '_')  // Replace any other non-alphanumeric chars (keep dots for extensions)
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/_+/g, '_')   // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .toLowerCase()
      .substring(0, 100); // Increase length limit but keep reasonable
  }

  sanitizePath(inputPath) {
    // Split path into components, sanitize each component, then rejoin
    const pathComponents = inputPath.split(path.sep);
    const cleanComponents = pathComponents.map(component => {
      // Don't sanitize empty components (from leading/trailing separators)
      if (!component) return component;
      
      // Sanitize each path component while preserving extensions
      return component
        .replace(/[<>:"|\*\?\r\n]/g, '_')  // Replace invalid characters
        .replace(/[^\w\-_\s\.]/g, '_')     // Keep word chars, hyphens, underscores, spaces, dots
        .replace(/\s+/g, '_')              // Replace spaces with underscores
        .replace(/_+/g, '_')               // Replace multiple underscores with single
        .replace(/^_|_$/g, '');            // Remove leading/trailing underscores
    });
    
    return cleanComponents.join(path.sep);
  }
}

module.exports = CustomPathBuilder; 