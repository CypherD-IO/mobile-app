const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require('path');

/**
 * Metro configuration for React Native 0.83.0
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);

// Filter out 'svg' from assetExts if we're treating it as a source extension
const assetExts = defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg');

const config = {
  resolver: {
    // Node.js polyfills for crypto/web3 libraries
    extraNodeModules: {
      assert: require.resolve('empty-module'),
      http: require.resolve('empty-module'),
      https: require.resolve('empty-module'),
      os: require.resolve('empty-module'),
      url: require.resolve('empty-module'),
      zlib: require.resolve('empty-module'),
      crypto: require.resolve('react-native-quick-crypto'),
      stream: require.resolve('readable-stream'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-level-fs'),
      '@walletconnect/react-native-compat': require.resolve('@walletconnect/react-native-compat'),
      // TEMP: Disable Intercom completely by aliasing it to a JS shim.
      // This is used to confirm whether Intercom is the sole cause of the startup crash
      // on RN 0.83 + New Architecture. Remove this alias to restore the real SDK.
      '@intercom/intercom-react-native': path.resolve(
        __dirname,
        'src/shims/intercom.ts',
      ),
    },
    // Source extensions - svg included if using svg transformer
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'svg'],
    // Asset extensions - use filtered list to avoid svg conflict
    assetExts: assetExts,
    // Prefer "main" and "module" fields to avoid resolving TypeScript source in node_modules
    // This fixes packages like 'ox' that ship TypeScript source alongside compiled code
    resolverMainFields: ['react-native', 'browser', 'main', 'module'],
    // Block TypeScript source files and test files inside node_modules
    // This prevents Metro from resolving .ts files in packages that ship source
    blockList: [
      /node_modules\/.*\/(?:core|tempo|erc\d+)\/.*\.ts$/,
      /node_modules\/.*\.test\.ts$/,
    ],
  },
};

module.exports = withNativeWind(
  mergeConfig(defaultConfig, config),
  {
    input: './global.css',
  },
);