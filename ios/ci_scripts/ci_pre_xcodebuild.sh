#!/bin/sh
set -e

# Use a more reliable path for the workspace
WORKSPACE_DIR="/Volumes/workspace/repository"
IOS_DIR="${WORKSPACE_DIR}/ios"
CYPHERD_DIR="${IOS_DIR}/CypherD"

# Create necessary directories if they don't exist
mkdir -p "${IOS_DIR}"
mkdir -p "${CYPHERD_DIR}"

echo "Workspace directory structure:"
ls -R "${WORKSPACE_DIR}"

# Path to the Info.plist file
INFO_PLIST_PATH="${CYPHERD_DIR}/Info.plist"

# Extract the current version and build number
VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${INFO_PLIST_PATH}" 2>/dev/null || echo "1.0")
BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "${INFO_PLIST_PATH}" 2>/dev/null || echo "1")

# Update the Info.plist with the new values
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "${INFO_PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${INFO_PLIST_PATH}"

echo "Updated Info.plist with version ${VERSION} and build number ${BUILD_NUMBER}"
echo "File modified: ${INFO_PLIST_PATH}"

# Path to the .env file in the root folder
ENV_FILE="${SRCROOT}/.env"

# Create .env file with environment variables
cat << EOF > "${ENV_FILE}"
SENTRY_DSN=${SENTRY_DSN}
ENVIROINMENT=${ENVIROINMENT}
AF_DEVKEY=${AF_DEVKEY}
AF_APPID=${AF_APPID}
AF_BARNDED_DOMAINS=${AF_BARNDED_DOMAINS}
AF_ONE_LINK_ID=${AF_ONE_LINK_ID}
AF_USER_INVITE_CHANNEL=${AF_USER_INVITE_CHANNEL}
INTERCOM_APP_KEY=${INTERCOM_APP_KEY}
WALLET_CONNECT_PROJECTID=${WALLET_CONNECT_PROJECTID}
EOF

echo "Created/Updated .env file in the root folder"
echo "File modified: ${ENV_FILE}"

# Path to the sentry.properties file
SENTRY_FILE="${IOS_DIR}/sentry.properties"

# Create sentry.properties file
cat << EOF > "${SENTRY_FILE}"
defaults.url=https://sentry.io/
defaults.org=${SENTRY_ORG}
defaults.project=${SENTRY_PROJECT}
auth.token=${SENTRY_TOKEN}
EOF

echo "Created/Updated sentry.properties file"
echo "File modified: ${SENTRY_FILE}"

# Path to the GoogleService-Info.plist file
PLIST_PATH="${CYPHERD_DIR}/GoogleService-Info.plist"

# Create or update GoogleService-Info.plist
/usr/libexec/PlistBuddy -c "Clear dict" "${PLIST_PATH}" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CLIENT_ID string ${GOOGLE_CLIENT_ID}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :REVERSED_CLIENT_ID string ${GOOGLE_REVERSED_CLIENT_ID}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :API_KEY string ${GOOGLE_API_KEY}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :GCM_SENDER_ID string ${GOOGLE_GCM_SENDER_ID}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :PLIST_VERSION string 1" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :BUNDLE_ID string ${GOOGLE_BUNDLE_ID}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :PROJECT_ID string ${GOOGLE_PROJECT_ID}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :STORAGE_BUCKET string ${GOOGLE_STORAGE_BUCKET}" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :IS_ADS_ENABLED bool false" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :IS_ANALYTICS_ENABLED bool false" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :IS_APPINVITE_ENABLED bool true" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :IS_GCM_ENABLED bool true" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :IS_SIGNIN_ENABLED bool true" "${PLIST_PATH}"
/usr/libexec/PlistBuddy -c "Add :GOOGLE_APP_ID string ${GOOGLE_APP_ID}" "${PLIST_PATH}"

echo "Created/Updated GoogleService-Info.plist"
echo "File modified: ${PLIST_PATH}"

# Log all modified files
echo "All files modified:"
echo "1. ${INFO_PLIST_PATH}"
echo "2. ${ENV_FILE}"
echo "3. ${SENTRY_FILE}"
echo "4. ${PLIST_PATH}"

# Display content of modified files for debugging
echo "Contents of modified files:"
echo "1. Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "${INFO_PLIST_PATH}"
echo "2. .env:"
cat "${ENV_FILE}"
echo "3. sentry.properties:"
cat "${SENTRY_FILE}"
echo "4. GoogleService-Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "${PLIST_PATH}"