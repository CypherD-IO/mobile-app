/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Cypherd.app',
      build: 'xcodebuild -workspace ios/Cypherd.xcworkspace -scheme Cypherd -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Cypherd.app',
      build: 'xcodebuild -workspace ios/Cypherd.xcworkspace -scheme Cypherd -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro Max',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_Pro_API_33',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
      behavior: {
        launchApp: 'auto',
        permissions: { notifications: "YES", camera: "YES" },
        launchArgs: { detoxTestMode: 'YES' },
      },
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
      behavior: {
        launchApp: 'auto',
        permissions: { notifications: "YES", camera: "YES" },
        launchArgs: { detoxTestMode: 'YES' },
      },
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
      behavior: {
        launchArgs: { detoxTestMode: 'YES' },
      },
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
      behavior: {
        launchArgs: { detoxTestMode: 'YES' },
      },
    },
  },
}; 