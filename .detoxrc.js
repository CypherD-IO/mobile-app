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
    'ios.sim.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Cypherd.app',
      build: 'xcodebuild -workspace ios/Cypherd.xcworkspace -scheme Cypherd -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 15,OS=17.5" -derivedDataPath ios/build ONLY_ACTIVE_ARCH=NO',
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
        type: 'iPhone 15',
        os: 'iOS 17.5'
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
      app: 'ios.sim.debug',
      device: 'simulator'
    },
    'ios.sim.release': {
      app: 'ios.release',
      device: 'simulator'
    },
    'android.emu.debug': {
      app: 'android.debug',
      device: 'android.emu.debug'
    },
    'android.emu.release': {
      app: 'android.release',
      device: 'android.emu.release'
    }
  },
}; 