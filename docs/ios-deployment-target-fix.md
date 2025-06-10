# iOS Deployment Target Fix for GitHub Actions

## Problem

When running builds in GitHub Actions, you may encounter warnings like:

```
The iOS Simulator deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 11.0,
but the range of supported deployment target versions is 12.0 to 17.5.99.
(in target 'Sentry-Sentry' from project 'Pods')
```

## Root Cause

1. **CocoaPods dependencies** often have their own minimum iOS deployment targets (e.g., iOS 11.0)
2. **GitHub Actions CI environment** only supports iOS 12.0+
3. **Xcode updates** periodically drop support for older iOS versions
4. **Resource bundles and framework targets** may not be caught by simple post-install hooks

## Solution

### 1. Enhanced Podfile Configuration

The `ios/Podfile` includes a comprehensive post-install hook that:

- Sets **all pod targets** to use iOS 15.0 minimum deployment target
- Handles **resource bundles** (like `RNCAsyncStorage-RNCAsyncStorage_resources`)
- Handles **framework targets** (like `Sentry-Sentry`)
- Uses version comparison to avoid downgrading newer targets

```ruby
post_install do |installer|
  react_native_post_install(installer)
  __apply_Xcode_12_5_M1_post_install_workaround(installer)

  # Comprehensive deployment target fix for all pod targets
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|

      # Fix for bundle targets (code signing issues)
      if target.respond_to?(:product_type) and target.product_type == "com.apple.product-type.bundle"
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end

      # Set deployment target for ALL targets (including resource bundles)
      current_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      minimum_target = '15.0'

      if current_target.nil? || Gem::Version.new(current_target) < Gem::Version.new(minimum_target)
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_target
      end

      # Additional compatibility settings for newer Xcode versions
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO' if config.name == 'Debug'
    end
  end

  # Fix for specific problematic pods that might need special handling
  installer.pods_project.targets.each do |target|
    if ['Sentry', 'Sentry-Sentry', 'RNCAsyncStorage-RNCAsyncStorage_resources'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      end
    end
  end
end
```

### 2. GitHub Actions Improvements

The workflow (`.github/workflows/detox-tests.yml`) includes:

- **Cache clearing** before pod install
- **Deployment target verification** step
- **Better error reporting** with specific checks

### 3. Verification Scripts

Use these scripts to verify the fix:

```bash
# Verify deployment targets locally
./scripts/verify-deployment-targets.sh

# Check for any remaining old targets
cd ios && grep -r "IPHONEOS_DEPLOYMENT_TARGET = 1[0-4]\." Pods/Pods.xcodeproj/project.pbxproj
```

## Why This Approach Works

1. **Comprehensive Coverage**: Catches all types of targets (frameworks, bundles, libraries)
2. **Version-Safe**: Only upgrades targets that are actually below the minimum
3. **CI-Compatible**: Ensures compatibility with GitHub Actions environment
4. **Future-Proof**: Uses a modern deployment target (iOS 15.0)

## Troubleshooting

### If you still see deployment target warnings:

1. **Clear CocoaPods cache**:

   ```bash
   cd ios
   pod cache clean --all
   rm -f Podfile.lock
   pod install
   ```

2. **Verify the fix**:

   ```bash
   ./scripts/verify-deployment-targets.sh
   ```

3. **Check for missed targets**:
   ```bash
   cd ios
   grep -r "IPHONEOS_DEPLOYMENT_TARGET = 1[0-4]\." Pods/Pods.xcodeproj/project.pbxproj
   ```

### Common Issues:

- **Cached builds**: Clear derived data and pod cache
- **Stale Podfile.lock**: Delete and reinstall pods
- **Custom pod configurations**: May need additional specific fixes

## Related Links

- [Apple Developer Forums on Deployment Targets](https://forums.developer.apple.com/forums/thread/656616)
- [CocoaPods Post Install Hooks](https://guides.cocoapods.org/syntax/podfile.html#post_install)
- [iOS 18 SDK Requirements](https://developer.apple.com/ios/submit/)

## Maintenance

This fix should be maintained whenever:

- Adding new CocoaPods dependencies
- Updating major iOS versions
- Updating Xcode versions in CI
- Apple changes deployment target requirements
