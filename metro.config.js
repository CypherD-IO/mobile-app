const { getDefaultConfig } = require('@react-native/metro-config');
const nodeLibs = require('node-libs-browser');

// Enhance node-libs-browser with specific overrides 
const extraNodeModules = {
  ...nodeLibs,
  // Override path with path-browserify
  path: require.resolve('path-browserify'),
  // Add react-native-level-fs for fs operations
  fs: require.resolve('react-native-level-fs'),
  '@walletconnect/react-native-compat': require.resolve('@walletconnect/react-native-compat'),
  '@walletconnect/web3wallet': require.resolve('@walletconnect/web3wallet'),
};

const config = {
  ...getDefaultConfig(__dirname),
  resolver: {
    extraNodeModules,
    // Preserve any existing resolver options from your config
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = config;

