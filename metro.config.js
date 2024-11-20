const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-level-fs'),
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('react-native-crypto'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  serializer: {
    // Enable source maps
    sourceMap: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);