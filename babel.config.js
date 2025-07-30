const lazyImports = require('metro-react-native-babel-preset/src/configs/lazy-imports');

module.exports = (api) => {
  api.cache(true);
  return {
    comments: false,
    compact: true,
    presets: [
      ['module:metro-react-native-babel-preset', { useTransformReactJSXExperimental: true }], 
      ['nativewind/babel', { mode: 'compileOnly' }]
    ],
    plugins: [
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-flow-strip-types',
      '@babel/plugin-proposal-optional-catch-binding',
      ['@babel/plugin-transform-private-methods', { loose: true }],
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-block-scoping',
      [
        '@babel/plugin-proposal-class-properties',
        {
          loose: true,
        },
      ],
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-syntax-export-default-from',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-computed-properties',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-destructuring',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-function-name',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-literals',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-parameters',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-shorthand-properties',
      [
            '@babel/plugin-transform-react-jsx',
            {
                runtime: 'automatic',
                importSource: "nativewind",
            },
        ],
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-regenerator',
      '@babel/plugin-transform-sticky-regex',
      '@babel/plugin-transform-unicode-regex',
      '@babel/plugin-proposal-export-default-from',
      [
        '@babel/plugin-transform-modules-commonjs',
        {
          strict: false,
          strictMode: false, // prevent "use strict" injections
          lazy: (importSpecifier) => lazyImports.has(importSpecifier),
          allowTopLevelThis: true, // dont rewrite global `this` -> `undefined`
        },
      ],
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-classes',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-arrow-functions'
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-spread',
      '@babel/plugin-proposal-object-rest-spread',
      // SUPPORTED BY DEFAULT: [
      // SUPPORTED BY DEFAULT:   '@babel/plugin-transform-template-literals',
      // SUPPORTED BY DEFAULT:   {loose: true}, // dont 'a'.concat('b'), just use 'a'+'b'
      // SUPPORTED BY DEFAULT: ],
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-exponentiation-operator',
      // SUPPORTED BY DEFAULT: '@babel/plugin-transform-object-assign',
      // SUPPORTED BY DEFAULT: ['@babel/plugin-transform-for-of', {loose: true}],
      // 'metro-react-native-babel-preset/src/transforms/transform-symbol-member',
      '@babel/plugin-transform-react-display-name',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      [
        '@babel/plugin-transform-runtime',
        {
          helpers: true,
          regenerator: true,
        },
      ],
    ],
  };
};
