/**
 * Setup file for unit tests.
 * Mocks native modules that would otherwise fail in a Node.js environment.
 */

// Mock react-native-config
jest.mock('react-native-config', () => ({
  IS_TESTING: 'true',
}));

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  ACCESSIBLE: { WHEN_UNLOCKED: 'WHEN_UNLOCKED' },
  ACCESS_CONTROL: { BIOMETRY_ANY: 'BIOMETRY_ANY' },
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
  Severity: { Error: 'error' },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// ── Component-level mocks ──
// These let tailwindComponents.tsx and component files execute in Node
// without native module errors. Only npm packages live here; internal
// module mocks stay in individual test files.

// nativewind — cssInterop wraps RN components with className support;
// identity function lets the unwrapped component pass through.
jest.mock('nativewind', () => ({
  cssInterop: component => component,
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
    toggleColorScheme: jest.fn(),
  }),
  // vars() is used by themeReducer to define CSS variable maps
  vars: obj => obj,
}));

// react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// react-native-fast-image
jest.mock('react-native-fast-image', () => {
  const { Image } = require('react-native');
  return { __esModule: true, default: Image };
});

// react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent: c => c,
    },
    useSharedValue: init => ({ value: init }),
    useAnimatedStyle: () => ({}),
    withTiming: val => val,
    withSpring: val => val,
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
    Layout: {},
  };
});

// react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View, ScrollView } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    PanGestureHandler: View,
    ScrollView,
    State: {},
    Directions: {},
  };
});

// react-native-keyboard-aware-scroll-view
jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const { ScrollView } = require('react-native');
  return { KeyboardAwareScrollView: ScrollView };
});

// lottie-react-native
jest.mock('lottie-react-native', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

// react-native-element-dropdown
jest.mock('react-native-element-dropdown', () => {
  const { View } = require('react-native');
  return { Dropdown: View };
});

// react-native-svg-charts
jest.mock('react-native-svg-charts', () => {
  const { View } = require('react-native');
  return { ProgressCircle: View };
});

// @react-native-vector-icons/material-design-icons
jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: Text };
});

// @react-native-vector-icons/icomoon — used by customFonts/generator
jest.mock('@react-native-vector-icons/icomoon', () => {
  const { Text } = require('react-native');
  // createIconSet returns a component
  return { __esModule: true, default: () => Text };
});
