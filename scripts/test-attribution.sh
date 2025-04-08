#!/bin/bash

# Test script for Android attribution tracking in CypherD Wallet

echo "CypherD Wallet Attribution Testing Script"
echo "========================================="

# Check if adb is installed
if ! command -v adb &> /dev/null; then
    echo "Error: adb is not installed or not in PATH"
    echo "Please install Android SDK platform tools"
    exit 1
fi

# Ensure device is connected
DEVICE_COUNT=$(adb devices | grep -v "List" | grep -v "^$" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "Error: No Android devices connected"
    echo "Please connect a device or start an emulator"
    exit 1
fi

# Functions
function test_attribution() {
    local utm_source=$1
    local utm_medium=$2
    local utm_campaign=$3
    local ref_code=$4
    
    # URL encode the parameters
    local referrer="utm_source%3D${utm_source}%26utm_medium%3D${utm_medium}%26utm_campaign%3D${utm_campaign}%26ref%3D${ref_code}"
    
    echo "Testing attribution with:"
    echo "- utm_source: $utm_source"
    echo "- utm_medium: $utm_medium"
    echo "- utm_campaign: $utm_campaign"
    echo "- ref: $ref_code"
    
    # Send intent to simulate Play Store attribution
    adb shell am start -a android.intent.action.VIEW -d "market://details?id=com.cypherd.androidwallet&referrer=${referrer}" com.android.vending
    
    echo "Intent sent to device. Now install and open the app."
}

function monitor_logs() {
    echo "Monitoring logs for attribution data (press Ctrl+C to stop)..."
    adb logcat | grep -E "InstallReferrerModule|ReferrerData|ReferralCode|install_attribution"
}

function clear_app_data() {
    echo "Clearing app data (this will remove all app data and settings)..."
    adb shell pm clear com.cypherd.androidwallet
    echo "App data cleared."
}

function uninstall_app() {
    echo "Uninstalling app..."
    adb shell pm uninstall com.cypherd.androidwallet
    echo "App uninstalled."
}

# Main menu
while true; do
    echo ""
    echo "Choose an option:"
    echo "1. Test with custom attribution parameters"
    echo "2. Test with preset test campaign"
    echo "3. Monitor attribution logs"
    echo "4. Clear app data (for repeat testing)"
    echo "5. Uninstall app"
    echo "0. Exit"
    read -p "Enter your choice: " choice
    
    case $choice in
        1)
            echo "Enter attribution parameters:"
            read -p "UTM Source: " utm_source
            read -p "UTM Medium: " utm_medium
            read -p "UTM Campaign: " utm_campaign
            read -p "Referral Code: " ref_code
            test_attribution "$utm_source" "$utm_medium" "$utm_campaign" "$ref_code"
            ;;
        2)
            test_attribution "test_source" "test_medium" "test_campaign" "TEST123"
            ;;
        3)
            monitor_logs
            ;;
        4)
            clear_app_data
            ;;
        5)
            uninstall_app
            ;;
        0)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            ;;
    esac
done 