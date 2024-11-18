const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = {
  resolver: {
    extraNodeModules: require('node-libs-browser'),
    // Add any additional resolver options here
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
  ...getDefaultConfig(__dirname), // Extend the default Metro config
};

