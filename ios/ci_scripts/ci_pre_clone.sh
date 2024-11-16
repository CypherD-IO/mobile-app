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
