#!/bin/bash
chmod +x ci_pre_xcodebuild.sh
set -e  # Stop on any error

# Function for logging
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if a file exists and is readable
check_file() {
    if [ ! -f "$1" ]; then
        log_message "ERROR: File not found: $1"
        exit 1
    elif [ ! -r "$1" ]; then
        log_message "ERROR: File not readable: $1"
        exit 1
    fi
}

# Function to check directory permissions
check_directory() {
    if [ ! -d "$1" ]; then
        log_message "ERROR: Directory not found: $1"
        exit 1
    elif [ ! -w "$1" ]; then
        log_message "ERROR: Directory not writable: $1"
        exit 1
    fi
}

log_message "Starting ci_pre_xcodebuild.sh"

# Use a more reliable path for the workspace
WORKSPACE_DIR="/Volumes/workspace/repository"
IOS_DIR="${WORKSPACE_DIR}/ios"
CYPHERD_DIR="${IOS_DIR}/CypherD"

# Check directories exist and are writable
check_directory "${WORKSPACE_DIR}"
check_directory "${IOS_DIR}"
check_directory "${CYPHERD_DIR}"

# Path to the Info.plist file
INFO_PLIST_PATH="${CYPHERD_DIR}/Info.plist"
check_file "${INFO_PLIST_PATH}"

# Verify environment variables
if [ -z "${SENTRY_ORG}" ] || [ -z "${SENTRY_PROJECT}" ] || [ -z "${SENTRY_TOKEN}" ]; then
    log_message "ERROR: Missing required Sentry environment variables"
    exit 1
fi

if [ -z "${GOOGLE_SERVICE_INFO_PLIST}" ]; then
    log_message "ERROR: GOOGLE_SERVICE_INFO_PLIST environment variable is empty"
    exit 1
fi

# Extract the current version and build number
VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${INFO_PLIST_PATH}" 2>/dev/null || echo "1.0")
BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print CFBundleVersion" "${INFO_PLIST_PATH}" 2>/dev/null || echo "1")

# Update the Info.plist with the new values
if ! /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "${INFO_PLIST_PATH}"; then
    log_message "ERROR: Failed to update CFBundleShortVersionString"
    exit 1
fi

if ! /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${INFO_PLIST_PATH}"; then
    log_message "ERROR: Failed to update CFBundleVersion"
    exit 1
fi

log_message "Updated Info.plist with version ${VERSION} and build number ${BUILD_NUMBER}"

# Path to the sentry.properties file
SENTRY_FILE="${IOS_DIR}/sentry.properties"

# Create sentry.properties file with error checking
if ! cat << EOF > "${SENTRY_FILE}"
defaults.url=https://sentry.io/
defaults.org=${SENTRY_ORG}
defaults.project=${SENTRY_PROJECT}
auth.token=${SENTRY_TOKEN}
EOF
then
    log_message "ERROR: Failed to create sentry.properties file"
    exit 1
fi

log_message "Created/Updated sentry.properties file"

# Path to the GoogleService-Info.plist file
PLIST_PATH="${CYPHERD_DIR}/GoogleService-Info.plist"

# Write GoogleService-Info.plist with error checking
if ! printf "%s" "${GOOGLE_SERVICE_INFO_PLIST}" > "${PLIST_PATH}"; then
    log_message "ERROR: Failed to write GoogleService-Info.plist"
    exit 1
fi

# Verify the plist is valid
if ! plutil -lint "${PLIST_PATH}"; then
    log_message "ERROR: Invalid plist file created"
    exit 1
fi

log_message "Created/Updated GoogleService-Info.plist"

# Verify the created files
check_file "${SENTRY_FILE}"
check_file "${PLIST_PATH}"

# Display content of modified files for debugging
log_message "Verification of created files:"
log_message "1. sentry.properties:"
cat "${SENTRY_FILE}"
log_message "2. GoogleService-Info.plist:"
/usr/libexec/PlistBuddy -c "Print" "${PLIST_PATH}"

# Setup Firebase Crashlytics
log_message "Setting up Firebase Crashlytics..."

# Define Crashlytics paths
PODS_ROOT="${IOS_DIR}/Pods"
CRASHLYTICS_DIR="${PODS_ROOT}/FirebaseCrashlytics"

# Create Crashlytics directory if it doesn't exist
if [ ! -d "${CRASHLYTICS_DIR}" ]; then
    log_message "Creating Crashlytics directory..."
    mkdir -p "${CRASHLYTICS_DIR}"
fi

# Ensure Crashlytics run script exists and is executable
CRASHLYTICS_RUN="${CRASHLYTICS_DIR}/run"
if [ ! -f "${CRASHLYTICS_RUN}" ]; then
    log_message "Creating Crashlytics run script..."
    touch "${CRASHLYTICS_RUN}"
fi
chmod +x "${CRASHLYTICS_RUN}"

# Ensure upload-symbols script exists and is executable
UPLOAD_SYMBOLS="${CRASHLYTICS_DIR}/upload-symbols"
if [ ! -f "${UPLOAD_SYMBOLS}" ]; then
    log_message "Creating upload-symbols script..."
    touch "${UPLOAD_SYMBOLS}"
fi
chmod +x "${UPLOAD_SYMBOLS}"

log_message "Firebase Crashlytics setup completed"

log_message "Script completed successfully"