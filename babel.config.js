module.exports = (api) => {
  api.cache(true);
  return {
    // Keep Babel config close to the React Native preset to avoid missing plugin packages
    // during RN upgrades (Metro/Babel resolve plugins from your dependencies).
    comments: false,
    compact: true,
    presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
    plugins: [
      // Needed for libraries that use `export * as ns from "./x.js"` (e.g. `web3-validator`).
      '@babel/plugin-transform-export-namespace-from',
      // Must be last per Reanimated docs.
      'react-native-reanimated/plugin',
    ],
  };
};
