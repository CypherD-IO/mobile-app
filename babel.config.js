module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
// module.exports = {
//   presets: ['module:metro-react-native-babel-preset'],
//   plugins: ['react-native-reanimated/plugin', 'nativewind/babel'],
// };
// const lazyImports = require('metro-react-native-babel-preset/src/configs/lazy-imports');

// module.exports = (api) => {
//   api.cache(true);
//   return {
//     comments: false,
//     compact: true,
//     presets: [
//       ['module:@react-native/babel-preset', { useTransformReactJSXExperimental: true }],
//     ],
//     plugins: [
      
//       ['@babel/plugin-transform-private-methods', { loose: true }],
//       ['@babel/plugin-transform-class-properties', { loose: true }],
//       '@babel/plugin-syntax-dynamic-import',
//       '@babel/plugin-syntax-export-default-from',
//       ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
//       '@babel/plugin-transform-sticky-regex',
//       '@babel/plugin-transform-unicode-regex',
//       '@babel/plugin-proposal-export-default-from',
//       '@babel/plugin-transform-object-rest-spread',
//       '@babel/plugin-transform-react-display-name',
//       '@babel/plugin-transform-optional-chaining',
//       '@babel/plugin-transform-nullish-coalescing-operator',
//       ['@babel/plugin-transform-runtime', {
//         helpers: true,
//         regenerator: true,
//       }],
//       'react-native-reanimated/plugin',
//       'nativewind/babel',
//       '@babel/plugin-transform-flow-strip-types',
//       '@babel/plugin-transform-optional-catch-binding',
//     ],
//   };
// };
