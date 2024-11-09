#!/bin/sh

echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"

# Create sentry.properties file
echo $SENTRY_PROPERTIES | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties
echo "sentry.properties file created"