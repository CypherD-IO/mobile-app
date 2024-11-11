#!/bin/sh

# export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
# have to add node yourself
brew install node@18
# link it to the path
brew link node@18

# Clear npm cache
npm cache clean --force

# Install dependencies you manage with CocoaPods.
npm install --legacy-peer-deps
rm -rf /Volumes/workspace/DerivedData
pod deintegrate
pod install --repo-update
# the sed command from RN cant find the file... so we have to run it ourselves
# sed -i -e  $'s/ && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_10_0)//' /Volumes/workspace/repository/ios/Pods/RCT-Folly/folly/portability/Time.h

echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"