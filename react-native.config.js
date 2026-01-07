module.exports = {
  project: {
    ios: {},
    android: {}
  },
  assets: ['./assets/fonts/'],
  dependencies: {
    // Disable autolinking for lottie-ios as lottie-react-native manages its own version
    'lottie-ios': {
      platforms: {
        ios: null,
        android: null,
      },
    },
  },
};
