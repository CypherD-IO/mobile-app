const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");


/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = mergeConfig(getDefaultConfig(__dirname), {
    resolver: {
    extraNodeModules: {
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-level-fs'),
      '@walletconnect/react-native-compat': require.resolve('@walletconnect/react-native-compat'),
    },
  },
  
});

module.exports = withNativeWind(config, { input: "./global.css" });  