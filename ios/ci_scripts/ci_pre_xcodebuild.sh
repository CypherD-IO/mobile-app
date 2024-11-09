#!/bin/sh

export SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
sentry-cli upload-dsym --auth-token $SENTRY_AUTH_TOKEN

echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"

# Create sentry.properties file
echo $SENTRY_PROPERTIES | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties
echo "sentry.properties file created"