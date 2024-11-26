#!/bin/bash

# Add debug information
echo "Current working directory: $(pwd)"

# Use absolute paths with $CI_PRIMARY_REPOSITORY_PATH
GOOGLE_PLIST_PATH="${CI_PRIMARY_REPOSITORY_PATH}/ios/GoogleService-Info.plist"
SENTRY_PROPS_PATH="${CI_PRIMARY_REPOSITORY_PATH}/ios/sentry.properties"

if [ -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then 
    echo "Error: GOOGLE_SERVICE_INFO_PLIST environment variable is not set" 
    exit 1 
fi 

if ! echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > "$GOOGLE_PLIST_PATH"; then 
    echo "Error: Failed to decode GoogleService-Info.plist" 
    exit 1 
fi 

chmod 600 "$GOOGLE_PLIST_PATH"
if [ ! -f "$GOOGLE_PLIST_PATH" ]; then 
    echo "Error: Failed to create GoogleService-Info.plist" 
    exit 1 
fi 

echo "Successfully created GoogleService-Info.plist at: $GOOGLE_PLIST_PATH"

# Similar changes for sentry.properties
if [ -z "$SENTRY_PROPERTIES" ]; then 
    echo "Error: SENTRY_PROPERTIES environment variable is not set" 
    exit 1 
fi 

if ! echo "$SENTRY_PROPERTIES" | base64 --decode > "$SENTRY_PROPS_PATH"; then 
    echo "Error: Failed to decode sentry.properties" 
    exit 1 
fi 

chmod 600 "$SENTRY_PROPS_PATH"
if [ ! -f "$SENTRY_PROPS_PATH" ]; then 
    echo "Error: Failed to create sentry.properties" 
    exit 1 
fi 

echo "Successfully created sentry.properties at: $SENTRY_PROPS_PATH"

# Verify files exist in the correct location
ls -la "${CI_PRIMARY_REPOSITORY_PATH}/ios/"

