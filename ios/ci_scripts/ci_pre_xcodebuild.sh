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
echo "File modified: $INFO_PLIST_PATH"

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
echo "File modified: $ENV_FILE"

# Path to the sentry.properties file
SENTRY_FILE="/Volumes/workspace/repository/ios/sentry.properties"
echo "defaults.url=https://sentry.io/" > $SENTRY_FILE
echo "defaults.org=${SENTRY_ORG}" >> $SENTRY_FILE
echo "defaults.project=${SENTRY_PROJECT}" >> $SENTRY_FILE
echo "auth.token=${SENTRY_TOKEN}" >> $SENTRY_FILE

echo "Updated sentry.properties with environment variables"
echo "File modified: $SENTRY_FILE"

# Path to the GoogleService-Info.plist file
PLIST_PATH="/Volumes/workspace/repository/ios/CypherD/GoogleService-Info.plist"

# Create the plist file if it doesn't exist
if [ ! -f "$PLIST_PATH" ]; then
  echo "Creating GoogleService-Info.plist"
  /usr/libexec/PlistBuddy -c "Save" "$PLIST_PATH"
fi

# Create or update keys in the plist
/usr/libexec/PlistBuddy -c "Add :CLIENT_ID string ${GOOGLE_CLIENT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :REVERSED_CLIENT_ID string ${GOOGLE_REVERSED_CLIENT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :API_KEY string ${GOOGLE_API_KEY}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :GCM_SENDER_ID string ${GOOGLE_GCM_SENDER_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :PLIST_VERSION string 1" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :BUNDLE_ID string ${GOOGLE_BUNDLE_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :PROJECT_ID string ${GOOGLE_PROJECT_ID}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :STORAGE_BUCKET string ${GOOGLE_STORAGE_BUCKET}" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :IS_ADS_ENABLED bool false" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :IS_ANALYTICS_ENABLED bool false" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :IS_APPINVITE_ENABLED bool true" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :IS_GCM_ENABLED bool true" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :IS_SIGNIN_ENABLED bool true" "$PLIST_PATH"
/usr/libexec/PlistBuddy -c "Add :GOOGLE_APP_ID string ${GOOGLE_APP_ID}" "$PLIST_PATH"

echo "Updated GoogleService-Info.plist with environment variables"
echo "File modified: $PLIST_PATH"

# Log all modified files
echo "All files modified:"
echo "1. $INFO_PLIST_PATH"
echo "2. $ENV_FILE"
echo "3. $SENTRY_FILE"
echo "4. $PLIST_PATH"

# Display content of modified files for debugging
echo "Contents of modified files:"
echo "1. Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "$INFO_PLIST_PATH"
echo "2. .env:"
cat "$ENV_FILE"
echo "3. sentry.properties:"
cat "$SENTRY_FILE"
echo "4. GoogleService-Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "$PLIST_PATH"