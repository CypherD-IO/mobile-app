#!/bin/sh
chmod +x ci_pre_xcodebuild.sh

xcodebuild clean -workspace Cypherd.xcworkspace -scheme Cypherd

ls /Volumes/workspace/repository/ios/
# Path to the Info.plist file
INFO_PLIST_PATH="/Volumes/workspace/repository/ios/CypherD/Info.plist"

# Extract the current version and build number
VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$INFO_PLIST_PATH")
BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "$INFO_PLIST_PATH")

# Update the Info.plist with the new values
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$INFO_PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST_PATH"

echo "Updated Info.plist with version $VERSION and build number $BUILD_NUMBER"