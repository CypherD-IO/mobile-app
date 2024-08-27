#!/bin/sh
set -e

echo "Starting ci_pre_xcodebuild.sh"

# Your existing script content here

# Add logging for Crashlytics
echo "Checking Crashlytics setup:"
export PODS_ROOT="/Volumes/workspace/repository/ios/Pods"
echo "PODS_ROOT: ${PODS_ROOT}"
ls -l "${PODS_ROOT}/FirebaseCrashlytics"

if [ -f "${PODS_ROOT}/FirebaseCrashlytics/run" ]; then
  echo "Crashlytics run script found"
  chmod +x "${PODS_ROOT}/FirebaseCrashlytics/run"
else
  echo "Crashlytics run script not found"
fi

if [ -f "${PODS_ROOT}/FirebaseCrashlytics/upload-symbols" ]; then
  echo "Crashlytics upload-symbols script found"
  chmod +x "${PODS_ROOT}/FirebaseCrashlytics/upload-symbols"
else
  echo "Crashlytics upload-symbols script not found"
fi

echo "Finished ci_pre_xcodebuild.sh"

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

echo "${GOOGLE_SERVICE_INFO_PLIST}" > "${PLIST_PATH}"

echo "Created/Updated GoogleService-Info.plist"
echo "File modified: ${PLIST_PATH}"

# Display content of modified files for debugging
echo "1. sentry.properties:"
cat "${SENTRY_FILE}"
echo "2. GoogleService-Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "${PLIST_PATH}"