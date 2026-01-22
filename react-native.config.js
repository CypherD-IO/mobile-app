module.exports = {
  project: {
    ios: {},
    android: {}
  },
  assets: ['./assets/fonts/'],
  /**
   * CocoaPods resolution note:
   * - `lottie-react-native` pins `lottie-ios` to an exact version.
   * - If we autolink the `lottie-ios` npm package (it ships a podspec), CocoaPods can see two
   *   competing sources/versions and fail resolution.
   * - We let `lottie-react-native` manage the `lottie-ios` pod dependency.
   */
  dependencies: {
    'lottie-ios': {
      platforms: {
        ios: null,
      },
    },
  },
};
