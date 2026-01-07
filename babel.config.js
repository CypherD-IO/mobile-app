/**
 * Babel configuration for React Native 0.83.0
 * Updated to use @react-native/babel-preset (replaces metro-react-native-babel-preset)
 * Many plugins are now built into the preset and have been removed
 */
module.exports = (api) => {
  api.cache(true);
  return {
    comments: false,
    compact: true,
    // Updated preset: metro-react-native-babel-preset -> @react-native/babel-preset
    presets: [['module:@react-native/babel-preset', { useTransformReactJSXExperimental: true }], 'nativewind/babel'],
    plugins: [
      // Reanimated plugin must be listed last (but we list it first and it gets processed last)
      'react-native-reanimated/plugin',
      
      // Transform plugins still needed
      '@babel/plugin-transform-flow-strip-types',
      ['@babel/plugin-transform-private-methods', { loose: true }],
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-syntax-export-default-from',
      
      // JSX transform for nativewind
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          importSource: 'nativewind',
        },
      ],
      
      // Regex transforms
      '@babel/plugin-transform-sticky-regex',
      '@babel/plugin-transform-unicode-regex',
      
      // Export default from syntax
      '@babel/plugin-proposal-export-default-from',
      
      // Export namespace from - needed for web3-validator
      '@babel/plugin-transform-export-namespace-from',
      
      // Display name for debugging
      '@babel/plugin-transform-react-display-name',
      
      // Runtime helpers
      [
        '@babel/plugin-transform-runtime',
        {
          helpers: true,
          regenerator: true,
        },
      ],
      
      // NOTE: The following plugins have been REMOVED as they are now built into @react-native/babel-preset:
      // - @babel/plugin-proposal-optional-catch-binding (now built-in)
      // - @babel/plugin-proposal-class-properties (now built-in)
      // - @babel/plugin-proposal-object-rest-spread (now built-in)
      // - @babel/plugin-proposal-optional-chaining (now built-in)
      // - @babel/plugin-proposal-nullish-coalescing-operator (now built-in)
      // - @babel/plugin-transform-modules-commonjs with lazy imports (handled by preset)
    ],
  };
};
