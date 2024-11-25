#!/bin/bash

if [ -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then 
    echo "Error: GOOGLE_SERVICE_INFO_PLIST environment variable is not set" 
    exit 1 
fi 

PLIST_PATH="./GoogleService-Info.plist"
if ! echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > "$PLIST_PATH"; then 
    echo "Error: Failed to decode GoogleService-Info.plist" 
    exit 1 
fi 

chmod 600 "$PLIST_PATH"
if [ ! -f "$PLIST_PATH" ]; then 
    echo "Error: Failed to create GoogleService-Info.plist" 
    exit 1 
fi 

echo "Successfully created GoogleService-Info.plist file"

if [ -z "$SENTRY_PROPERTIES" ]; then 
    echo "Error: SENTRY_PROPERTIES environment variable is not set" 
    exit 1 
fi 

SENTRY_PATH="./sentry.properties"
if ! echo "$SENTRY_PROPERTIES" | base64 --decode > "$SENTRY_PATH"; then 
    echo "Error: Failed to decode sentry.properties" 
    exit 1 
fi 

chmod 600 "$SENTRY_PATH"
if [ ! -f "$SENTRY_PATH" ]; then 
    echo "Error: Failed to create sentry.properties" 
    exit 1 
fi 

echo "Successfully created sentry.properties file"

