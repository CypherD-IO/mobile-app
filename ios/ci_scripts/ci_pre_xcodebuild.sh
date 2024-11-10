#!/bin/sh

# Create required files first
echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"

# Create sentry.properties file
echo $SENTRY_PROPERTIES | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties
echo "sentry.properties file created"

# Install and configure Sentry CLI
brew install getsentry/tools/sentry-cli

# Export auth token
export SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# Look for dSYM files in the default location
DSYM_PATH="/Volumes/workspace/DerivedData/Build/Products/Release-iphoneos"
if [ -d "$DSYM_PATH" ]; then
    sentry-cli upload-dsym --auth-token $SENTRY_AUTH_TOKEN "$DSYM_PATH"
else
    echo "Warning: dSYM path not found at $DSYM_PATH"
fi