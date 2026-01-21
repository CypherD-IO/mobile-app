const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { resolve } = require('metro-resolver');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);
const defaultResolveRequest =
  defaultConfig.resolver?.resolveRequest != null
    ? defaultConfig.resolver.resolveRequest
    : resolve;

const config = {
  resolver: {
    extraNodeModules: {
      assert: require.resolve('empty-module'), // assert can be polyfilled here if needed
      http: require.resolve('empty-module'), // stream-http can be polyfilled here if needed
      https: require.resolve('empty-module'), // https-browserify can be polyfilled here if needed
      os: require.resolve('empty-module'), // os-browserify can be polyfilled here if needed
      url: require.resolve('empty-module'), // url can be polyfilled here if needed
      zlib: require.resolve('empty-module'), // browserify-zlib can be polyfilled here if needed
      crypto: require.resolve('react-native-quick-crypto'),
      stream: require.resolve('readable-stream'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-level-fs'),
      '@walletconnect/react-native-compat': require.resolve('@walletconnect/react-native-compat'),
    },
    // Keep Metro defaults (includes cjs/mjs in newer Metro) and add our custom extensions.
    sourceExts: Array.from(
      new Set([...(defaultConfig.resolver.sourceExts ?? []), 'svg']),
    ),
    /**
     * Main fields ordering:
     *
     * We intentionally avoid `module` here.
     *
     * Why: multiple RN libraries ship ESM builds under `lib/module/**` that include
     * `*NativeComponent.js` specs. During RN 0.83 migration, Metro can end up running the
     * codegen parser against those compiled spec files during bundling and crash with:
     *   "Could not find component config for native component"
     *
     * Prefer the CJS entry (which many libraries map to typed sources via `"react-native"` field).
     * If we later find a package that *requires* the `module` field, we can add a targeted exception.
     */
    resolverMainFields: ['react-native', 'browser', 'main'],

    /**
     * Targeted resolver fixes (avoid global "whack-a-mole"):
     *
     * - `react-native-safe-area-context`:
     *   Its `module` (ESM) build can trigger RN's codegen babel plugin to throw:
     *     "Could not find component config for native component"
     *   because the compiled JS does not carry enough schema/type info.
     *   We force Metro to resolve the package root to the CJS entry, which is mapped
     *   to typed sources via the package `"react-native"` field.
     *
     * - `ox/tempo/*`:
     *   Some dependency graphs can accidentally resolve `ox/tempo/*.ts` (source files),
     *   which then import sibling files with `.js` extensions that only exist in the compiled outputs.
     *   We force Metro to resolve `ox/tempo/*` to `_cjs/tempo/*.js`.
     */
    resolveRequest: (context, moduleName, platform) => {
      /**
       * RN 0.83 codegen bundling guardrails (systematic fix):
       *
       * Some libraries publish compiled JS entrypoints under `lib/module/**` (ESM) and `lib/commonjs/**` (CJS).
       * Their compiled `*NativeComponent.js` spec files typically do NOT preserve Flow/TS type information
       * required by RN's codegen babel transform during bundling. When Metro resolves those compiled spec files,
       * the codegen parser can crash with:
       *   "Could not find component config for native component"
       *
       * Instead of playing whack-a-mole with `lib/module -> lib/commonjs` redirects (which still point to
       * compiled spec files), we force Metro to use the package's *source* entrypoints under `src/`,
       * where the codegen parser can read the spec types.
       */

      // safe-area-context: prefer source entrypoint
      if (moduleName === 'react-native-safe-area-context') {
        return defaultResolveRequest(
          context,
          'react-native-safe-area-context/src/index.tsx',
          platform,
        );
      }

      // lottie-react-native: prefer source entrypoint
      if (moduleName === 'lottie-react-native') {
        return defaultResolveRequest(
          context,
          'lottie-react-native/src/index.tsx',
          platform,
        );
      }

      /**
       * @injectivelabs/sdk-ts subpath exports:
       *
       * The SDK publishes a helpful `./exports` entrypoint (e.g. `@injectivelabs/sdk-ts/exports`),
       * but Metro does not consistently honor package.json `"exports"` in all setups.
       *
       * To avoid runtime "Unable to resolve module '@injectivelabs/sdk-ts/exports'" errors,
       * we map that subpath to the concrete CJS file that exists on disk.
       *
       * (We keep using the `@injectivelabs/sdk-ts/exports` import in TS for correct types.)
       */
      if (moduleName === '@injectivelabs/sdk-ts/exports') {
        return defaultResolveRequest(
          context,
          '@injectivelabs/sdk-ts/dist/cjs/exports.cjs',
          platform,
        );
      }

      // react-native-svg: prefer source entrypoint
      if (moduleName === 'react-native-svg') {
        return defaultResolveRequest(
          context,
          'react-native-svg/src/index.ts',
          platform,
        );
      }

      /**
       * Valtio (used by @reown/appkit controllers) publishes an ESM `.mjs` build that references
       * `import.meta.env` for dev-only guards. Metro does not support `import.meta` and will throw:
       *   "'import.meta' is currently unsupported"
       *
       * The CJS build (`valtio/*.js`) uses `process.env.NODE_ENV` instead and works fine in RN/Hermes.
       *
       * IMPORTANT: Do NOT resolve via `defaultResolveRequest(context, 'valtio/index.js', ...)`.
       * Valtio’s package.json `exports` wildcard will treat the requested subpath as `index.js`,
       * producing a non-existent `./esm/index.js.mjs` mapping and causing Metro to fall back in
       * unpredictable ways. Instead, return a direct `filePath` to the CJS file to fully bypass
       * package `exports` for this library.
       */
      if (moduleName === 'valtio') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'valtio', 'index.js'),
        };
      }
      if (moduleName === 'valtio/vanilla') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'valtio', 'vanilla.js'),
        };
      }
      if (moduleName === 'valtio/react') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'valtio', 'react.js'),
        };
      }
      if (moduleName.startsWith('valtio/esm/')) {
        // Any explicit ESM import should be redirected to CJS.
        // e.g. `valtio/esm/vanilla.mjs` -> `valtio/vanilla.js`
        const leaf = moduleName.slice('valtio/esm/'.length);
        if (leaf.startsWith('vanilla')) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, 'node_modules', 'valtio', 'vanilla.js'),
          };
        }
        if (leaf.startsWith('react')) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, 'node_modules', 'valtio', 'react.js'),
          };
        }
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'valtio', 'index.js'),
        };
      }
      if (moduleName.startsWith('valtio/vanilla/')) {
        const subpath = moduleName
          .slice('valtio/vanilla/'.length)
          .replace(/\.(cjs|mjs|js|ts|tsx)$/, '');
        return {
          type: 'sourceFile',
          filePath: path.join(
            __dirname,
            'node_modules',
            'valtio',
            'vanilla',
            `${subpath}.js`,
          ),
        };
      }
      if (moduleName.startsWith('valtio/react/')) {
        const subpath = moduleName
          .slice('valtio/react/'.length)
          .replace(/\.(cjs|mjs|js|ts|tsx)$/, '');
        return {
          type: 'sourceFile',
          filePath: path.join(
            __dirname,
            'node_modules',
            'valtio',
            'react',
            `${subpath}.js`,
          ),
        };
      }

      /**
       * Zustand:
       *
       * Zustand v5 publishes ESM entrypoints under `esm/*.mjs` that use `import.meta.env` in the
       * devtools middleware. Hermes does NOT support `import.meta`, so Release builds fail with:
       *   "'import.meta' is currently unsupported"
       *
       * Zustand also ships equivalent CJS entrypoints (`*.js`) that use `process.env.NODE_ENV`
       * and are Hermes-compatible.
       *
       * We force the common entrypoints to CJS via direct file paths (bypassing package `exports`).
       */
      if (moduleName === 'zustand') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'zustand', 'index.js'),
        };
      }
      if (moduleName === 'zustand/vanilla') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'zustand', 'vanilla.js'),
        };
      }
      if (moduleName === 'zustand/react') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'zustand', 'react.js'),
        };
      }
      if (moduleName === 'zustand/middleware') {
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'zustand', 'middleware.js'),
        };
      }
      if (moduleName.startsWith('zustand/middleware/')) {
        const subpath = moduleName
          .slice('zustand/middleware/'.length)
          .replace(/\.(cjs|mjs|js|ts|tsx)$/, '');
        return {
          type: 'sourceFile',
          filePath: path.join(
            __dirname,
            'node_modules',
            'zustand',
            'middleware',
            `${subpath}.js`,
          ),
        };
      }
      if (moduleName.startsWith('zustand/esm/')) {
        // Any explicit ESM import should be redirected to CJS.
        const leaf = moduleName.slice('zustand/esm/'.length);
        if (leaf.startsWith('middleware')) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, 'node_modules', 'zustand', 'middleware.js'),
          };
        }
        if (leaf.startsWith('vanilla')) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, 'node_modules', 'zustand', 'vanilla.js'),
          };
        }
        if (leaf.startsWith('react')) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, 'node_modules', 'zustand', 'react.js'),
          };
        }
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, 'node_modules', 'zustand', 'index.js'),
        };
      }

      // Map deep imports of compiled spec files back to their TS sources (covers internal relative imports).
      const origin = context?.originModulePath ?? '';
      if (
        origin.includes('/node_modules/lottie-react-native/lib/') &&
        moduleName.includes('specs/LottieAnimationViewNativeComponent')
      ) {
        return defaultResolveRequest(
          context,
          'lottie-react-native/src/specs/LottieAnimationViewNativeComponent.ts',
          platform,
        );
      }
      if (
        origin.includes('/node_modules/react-native-safe-area-context/lib/') &&
        moduleName.includes('specs/NativeSafeArea')
      ) {
        // e.g. ./specs/NativeSafeAreaView -> src/specs/NativeSafeAreaView.ts
        const leaf = moduleName.split('/').pop()?.replace(/\.js$/, '') ?? '';
        if (leaf) {
          return defaultResolveRequest(
            context,
            `react-native-safe-area-context/src/specs/${leaf}.ts`,
            platform,
          );
        }
      }
      if (
        origin.includes('/node_modules/react-native-svg/lib/') &&
        moduleName.includes('fabric/') &&
        moduleName.includes('NativeComponent')
      ) {
        const leaf = moduleName.split('/').pop()?.replace(/\.js$/, '') ?? '';
        if (leaf) {
          return defaultResolveRequest(
            context,
            `react-native-svg/src/fabric/${leaf}.ts`,
            platform,
          );
        }
      }

      // ox Tempo: never take TS sources; always take compiled CJS.
      if (moduleName === 'ox/tempo') {
        return defaultResolveRequest(context, 'ox/_cjs/tempo/index.js', platform);
      }
      if (moduleName.startsWith('ox/tempo/')) {
        const subpath = moduleName
          .slice('ox/tempo/'.length)
          .replace(/\.(cjs|mjs|js|ts|tsx)$/, '');
        return defaultResolveRequest(
          context,
          `ox/_cjs/tempo/${subpath}.js`,
          platform,
        );
      }

      /**
       * libsodium (WASM) guardrails:
       *
       * Some dependency graphs pull in `libsodium-wrappers-sumo` -> `libsodium-sumo`,
       * whose bundle expects WebAssembly. Hermes does not support WebAssembly, so it crashes with:
       *   "ReferenceError: Property 'WebAssembly' doesn't exist"
       *
       * We already pin `libsodium`/`libsodium-wrappers` to 0.8.x, which works in Metro without WASM.
       * Force any `*-sumo` imports to the non-sumo packages.
       */
      if (moduleName === 'libsodium-wrappers-sumo') {
        return defaultResolveRequest(context, 'libsodium-wrappers', platform);
      }
      if (moduleName.startsWith('libsodium-wrappers-sumo/')) {
        const subpath = moduleName.slice('libsodium-wrappers-sumo/'.length);
        return defaultResolveRequest(
          context,
          `libsodium-wrappers/${subpath}`,
          platform,
        );
      }
      if (moduleName === 'libsodium-sumo') {
        return defaultResolveRequest(context, 'libsodium', platform);
      }
      if (moduleName.startsWith('libsodium-sumo/')) {
        const subpath = moduleName.slice('libsodium-sumo/'.length);
        return defaultResolveRequest(context, `libsodium/${subpath}`, platform);
      }

      return defaultResolveRequest(context, moduleName, platform);
    },
    assetExts: [
      ...(defaultConfig.resolver.assetExts ?? []).filter(ext => ext !== 'svg'),
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
    ],
  },
};

module.exports = withNativeWind(
  mergeConfig(defaultConfig, config),
  {
    input: './global.css',
  },
);

/**
 * NativeWind / react-native-css-interop transformer path fix:
 *
 * When Metro resolves `transformerPath` via Node module resolution, it can accidentally pick up a
 * nested (and sometimes incomplete) copy of `react-native-css-interop` under `nativewind/node_modules`.
 * That shows up as:
 *   "Cannot find module .../node_modules/nativewind/node_modules/react-native-css-interop/dist/metro/transformer.js"
 *
 * Force Metro to use the root-resolved transformer *path* (NOT `babelTransformerPath`).
 * `babelTransformerPath` uses a different signature and will cause runtime errors.
 */
module.exports.transformerPath = require.resolve(
  'react-native-css-interop/dist/metro/transformer',
);