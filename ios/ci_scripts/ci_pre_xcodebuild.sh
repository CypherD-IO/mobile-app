#!/bin/sh

echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"

# Create sentry.properties file
cat << EOF > /Volumes/workspace/repository/ios/sentry.properties
defaults.url=https://sentry.io/
defaults.org=${SENTRY_ORG}
defaults.project=${SENTRY_PROJECT}
auth.token=${SENTRY_TOKEN}
EOF