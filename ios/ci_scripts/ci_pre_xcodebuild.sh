#!/bin/bash


# Create required files first
echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > /Volumes/workspace/repository/ios/GoogleService-Info.plist
echo "GoogleService-Info.plist file created"

# Create firebase.json if it doesn't exist
if [ ! -f "../firebase.json" ]; then
    echo '{
      "react-native": {
        "crashlytics_debug_enabled": true,
        "crashlytics_disable_auto_disabler": true,
        "crashlytics_auto_collection_enabled": true,
        "analytics_auto_collection_enabled": true,
        "messaging_auto_init_enabled": true,
        "messaging_ios_auto_register_for_remote_messages": true
      }
    }' > ../firebase.json
fi
