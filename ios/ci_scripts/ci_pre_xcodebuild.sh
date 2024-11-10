#!/bin/bash


# Create required files first
echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > GoogleService-Info.plist
if [ ! -f "GoogleService-Info.plist" ]; then
    echo "Error: Failed to create GoogleService-Info.plist"
    exit 1
fi

echo "$SENTRY_PROPERTIES" | base64 --decode > sentry.properties
if [ ! -f "sentry.properties" ]; then
    echo "Error: Failed to create sentry.properties"
    exit 1
fi

# # Install sentry-cli
# HOMEBREW_NO_AUTO_UPDATE=1 brew tap getsentry/tools
# HOMEBREW_NO_AUTO_UPDATE=1 brew install getsentry-cli

# # Wait for dSYM generation
# sleep 10

# # Define possible dSYM paths
# POSSIBLE_DSYM_PATHS=(
#     "${CI_DERIVED_DATA_PATH}/Build/Products/Release-iphoneos/*.dSYM"
#     "${CI_DERIVED_DATA_PATH}/Build/Products/Debug-iphoneos/*.dSYM"
#     "${CI_WORKSPACE}/build.xcarchive/dSYMs/*.dSYM"
#     "${CI_WORKSPACE}/ios/build/*.dSYM"
# )

# # Upload dSYMs
# DSYM_FOUND=false
# for DSYM_PATTERN in "${POSSIBLE_DSYM_PATHS[@]}"; do
#     echo "Checking for dSYMs in: $DSYM_PATTERN"
#     for DSYM_PATH in $DSYM_PATTERN; do
#         if [ -d "$DSYM_PATH" ]; then
#             echo "Found dSYM at: $DSYM_PATH"
#             sentry-cli --log-level=debug upload-dsym "$DSYM_PATH"
#             DSYM_FOUND=true
#         fi
#     done
# done

# # Print final status
# echo "Script completed. Final status:"
# echo "- sentry.properties exists: $([ -f "sentry.properties" ] && echo "Yes" || echo "No")"
# echo "- GoogleService-Info.plist exists: $([ -f "GoogleService-Info.plist" ] && echo "Yes" || echo "No")"
# echo "- dSYM files found: $DSYM_FOUND"