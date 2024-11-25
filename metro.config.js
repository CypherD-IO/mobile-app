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
      '@walletconnect/react-native-compat': require.resolve('@walletconnect/react-native-compat'),
        '@walletconnect/web3wallet': require.resolve('@walletconnect/web3wallet'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

