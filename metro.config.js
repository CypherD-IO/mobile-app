/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('metro-config');
const path = require('path');
const fs = require('fs');
const nodeLibs = require('node-libs-browser');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts }
  } = await getDefaultConfig();

  const extraNodeModules = {
    ...nodeLibs,
    ...new Proxy({}, {
      get: (target, name) => {
        const mainPath = path.join(__dirname, `node_modules/${name}`);
        if (fs.existsSync(mainPath)) {
          return mainPath;
        }
        const reownPath = path.join(__dirname, `node_modules/@reown/appkit-core-react-native/node_modules/${name}`);
        if (fs.existsSync(reownPath)) {
          return reownPath;
        }
        return mainPath; // Default to main path if neither exists
      }
    }),
    'valtio': path.join(__dirname, 'node_modules/valtio'),
  };

  const watchFolders = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, 'node_modules/@reown/appkit-core-react-native/node_modules'),
  ].filter(folder => fs.existsSync(folder));

  return {
    resolver: {
      sourceExts,
      assetExts,
      extraNodeModules,
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    watchFolders,
  };
})();
