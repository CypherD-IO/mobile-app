/**
 * Metro configuration for React Native
 * https://reactnative.dev/docs/metro
 *
 * @format
 */

const extraNodeModules = require('node-libs-browser');
module.exports = {
  resolver: {
    extraNodeModules
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true
      }
    })
  }
};
