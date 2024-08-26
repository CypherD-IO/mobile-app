PLIST_PATH="${PROJECT_DIR}/ios/Cypherd/Info.plist"

# Extract the short version string (app version) from Info.plist
APP_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${PLIST_PATH}")

# Extract the bundle version (build number) from Info.plist
BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "${PLIST_PATH}")

# Combine app version and build number
FULL_VERSION="${APP_VERSION} (${BUILD_NUMBER})"

# Set the versions as environment variables
echo "REACT_NATIVE_APP_VERSION=${APP_VERSION}" >> ${BASH_ENV}
echo "REACT_NATIVE_BUILD_NUMBER=${BUILD_NUMBER}" >> ${BASH_ENV}
echo "REACT_NATIVE_FULL_VERSION=${FULL_VERSION}" >> ${BASH_ENV}

# Print the versions for debugging
echo "App Version: ${APP_VERSION}"
echo "Build Number: ${BUILD_NUMBER}"
echo "Full Version: ${FULL_VERSION}"