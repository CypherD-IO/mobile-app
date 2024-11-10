#!/bin/sh

# Make script executable
chmod +x "${BASH_SOURCE[0]}"

# Set working directory
cd /Volumes/workspace/repository/ios

# Create required files first
echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > GoogleService-Info.plist
if [ ! -f "GoogleService-Info.plist" ]; then
    echo "Error: Failed to create GoogleService-Info.plist"
    exit 1
fi
echo "GoogleService-Info.plist file created"

# Create and verify sentry.properties file
echo $SENTRY_PROPERTIES | base64 --decode > sentry.properties
if [ ! -f "sentry.properties" ]; then
    echo "Error: Failed to create sentry.properties"
    exit 1
fi
echo "sentry.properties file created"

# Verify sentry.properties content
cat sentry.properties
echo "Sentry.properties content shown above"

# Configure Sentry CLI
export SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
export SENTRY_ORG=$SENTRY_ORG
export SENTRY_PROJECT=$SENTRY_PROJECT

# Install Sentry CLI without Homebrew auto-update
HOMEBREW_NO_AUTO_UPDATE=1 brew install getsentry/tools/sentry-cli

# Debug information
echo "Current directory: $(pwd)"
echo "Sentry Auth Token: ${SENTRY_AUTH_TOKEN:0:8}..."
echo "Sentry Org: $SENTRY_ORG"
echo "Sentry Project: $SENTRY_PROJECT"

# Wait for dSYM files to be generated
sleep 10

# Check multiple possible dSYM locations
POSSIBLE_DSYM_PATHS=(
    "/Volumes/workspace/DerivedData/Build/Products/Release-iphoneos/*.dSYM"
    "/Volumes/workspace/build.xcarchive/dSYMs/*.dSYM"
    "${CI_DERIVED_DATA_PATH}/Build/Products/Release-iphoneos/*.dSYM"
    "/Volumes/workspace/repository/ios/build/*.dSYM"
)

DSYM_FOUND=false
for DSYM_PATTERN in "${POSSIBLE_DSYM_PATHS[@]}"; do
    echo "Checking for dSYMs in: $DSYM_PATTERN"
    for DSYM_PATH in $DSYM_PATTERN; do
        if [ -d "$DSYM_PATH" ]; then
            echo "Found dSYM at: $DSYM_PATH"
            sentry-cli --log-level=debug upload-dsym "$DSYM_PATH"
            DSYM_FOUND=true
        fi
    done
done

if [ "$DSYM_FOUND" = false ]; then
    echo "Warning: No dSYM files found in any of the expected locations"
    echo "Listing contents of build directories:"
    ls -R /Volumes/workspace/DerivedData/Build/Products/Release-iphoneos || true
    ls -R /Volumes/workspace/build.xcarchive/dSYMs || true
    ls -R "${CI_DERIVED_DATA_PATH}/Build/Products/Release-iphoneos" || true
    ls -R /Volumes/workspace/repository/ios/build || true
fi

# Verify final state
echo "Script completed. Final status:"
echo "- sentry.properties exists: $([ -f "sentry.properties" ] && echo "Yes" || echo "No")"
echo "- GoogleService-Info.plist exists: $([ -f "GoogleService-Info.plist" ] && echo "Yes" || echo "No")"
echo "- dSYM files found: $DSYM_FOUND"