/** @type {Detox.DetoxConfig} */
const iosDeviceName = process.env.DETOX_DEVICE_NAME || 'iPhone 16';
const iosBuildCommand = `xcodebuild -workspace ios/Cypherd.xcworkspace -scheme Cypherd -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=${iosDeviceName}" -derivedDataPath ios/build ONLY_ACTIVE_ARCH=NO`;

module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: process.env.CI ? 180000 : 120000, // 3 minutes for CI
    },
  },
  artifacts: {
    rootDir: './e2e/artifacts',
    pathBuilder: './e2e/config/pathbuilder.js',
    plugins: {
      log: process.env.CI ? 'failing' : 'none',
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: process.env.CI ? false : true,
        takeWhen: {
          testStart: false,
          testDone: process.env.CI ? true : false,
          appNotReady: true,
          testFailure: true,
        },
      },
      
      video: process.env.CI ? {
        android: 'failing',
        simulator: 'failing',
      } : 'none',
      instruments: process.env.CI ? 'failing' : 'none',
      uiHierarchy: process.env.CI ? 'failing' : 'none',
    },
  },
  apps: {
    'ios.sim.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Cypherd.app',
      build: process.env.CI 
        ? `${iosBuildCommand} -quiet`
        : iosBuildCommand,
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
        type: iosDeviceName,
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