#!/bin/sh
chmod +x ci_pre_xcodebuild.sh

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

# adding the sentry.properties .env and GoogleService-Info.plist
echo "updating the sentry.properties, .env and GoogleService-Info.plist files"

# Path to the .env file
ENV_FILE="${SRCROOT}/.env"
echo "SENTRY_DSN=${SENTRY_DSN}" > $ENV_FILE
echo "ENVIROINMENT=${ENVIROINMENT}" >> $ENV_FILE
echo "AF_DEVKEY=${AF_DEVKEY}" >> $ENV_FILE
echo "AF_APPID=${AF_APPID}" >> $ENV_FILE
echo "AF_BARNDED_DOMAINS=${AF_BARNDED_DOMAINS}" >> $ENV_FILE
echo "AF_ONE_LINK_ID=${AF_ONE_LINK_ID}" >> $ENV_FILE
echo "AF_USER_INVITE_CHANNEL=${AF_USER_INVITE_CHANNEL}" >> $ENV_FILE
echo "INTERCOM_APP_KEY=${INTERCOM_APP_KEY}" >> $ENV_FILE
echo "WALLET_CONNECT_PROJECTID=${WALLET_CONNECT_PROJECTID}" >> $ENV_FILE

echo "Updated .env with environment variables"

# Path to the sentry.properties file
SENTRY_FILE="/Volumes/workspace/repository/ios/sentry.properties"
echo "defaults.url=https://sentry.io/" > $SENTRY_FILE
echo "defaults.org=${SENTRY_ORG}" >> $SENTRY_FILE
echo "defaults.project=${SENTRY_PROJECT}" >> $SENTRY_FILE
echo "auth.token=${SENTRY_TOKEN}" >> $SENTRY_FILE

echo "Updated sentry.properties with environment variables"

# Path to the GoogleService-Info.plist file
PLIST_PATH="/Volumes/workspace/repository/ios/CypherD/GoogleService-Info.plist"

# Update GoogleService-Info.plist with environment variables
/usr/libexec/PlistBuddy -c "Set :CLIENT_ID ${GOOGLE_CLIENT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :REVERSED_CLIENT_ID ${GOOGLE_REVERSED_CLIENT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :API_KEY ${GOOGLE_API_KEY}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :GCM_SENDER_ID ${GOOGLE_GCM_SENDER_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :BUNDLE_ID ${GOOGLE_BUNDLE_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :PROJECT_ID ${GOOGLE_PROJECT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :STORAGE_BUCKET ${GOOGLE_STORAGE_BUCKET}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Set :GOOGLE_APP_ID ${GOOGLE_APP_ID}" "$PLIST_PATH"

echo "Updated GoogleService-Info.plist with environment variables"
