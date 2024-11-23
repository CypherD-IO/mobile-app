#!/bin/sh

# Prevent Homebrew from auto-cleanup
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Install CocoaPods using Homebrew
brew install cocoapods

# Install Node.js version 18.17.0 using nvm (Node Version Manager)
# Install nvm if not already installed
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
fi

# Load nvm and install Node.js 18.17.0
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0

# Verify Node.js version
node -v

sudo ln -sf $(which node) /Users/local/.nvm/versions/node/v18.17.0/bin/node

NODE_PATH=$(which node)

# Print the Node.js path for debugging purposes
echo "Node.js binary is located at: $NODE_PATH"

# Export NODE_BINARY for Xcode to use
export NODE_BINARY=$NODE_PATH



# Install dependencies with npm, using legacy-peer-deps if needed
npm install --legacy-peer-deps

# Clean up DerivedData folder if it exists
rm -rf /Volumes/workspace/DerivedData

# Deintegrate and reinstall CocoaPods dependencies
pod deintegrate
pod install --repo-update

# The sed command from React Native that needs to be run manually (uncomment if needed)
# sed -i -e $'s/ && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_10_0)//' /Volumes/workspace/repository/ios/Pods/RCT-Folly/folly/portability/Time.h

# Add these debug lines to verify paths
echo "Current directory: $(pwd)"

# Define PROJECT_DIR relative to script location
PROJECT_DIR="$(pwd)/../"  # Goes up one level from ci_scripts to ios directory

echo "PROJECT_DIR: $PROJECT_DIR"
echo "Info.plist path: $PROJECT_DIR/Cypherd/Info.plist"

# Update Info.plist values with correct path
if ! /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING_VERSION" "$PROJECT_DIR/Cypherd/Info.plist"; then
    echo "Error: Failed to update CFBundleShortVersionString in Info.plist"
    exit 1
fi

if ! /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CURRENT_PROJECT_VERSION" "$PROJECT_DIR/Cypherd/Info.plist"; then
    echo "Error: Failed to update CFBundleVersion in Info.plist"
    exit 1
fi

# Verify the changes
CURRENT_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PROJECT_DIR/Cypherd/Info.plist")
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PROJECT_DIR/Cypherd/Info.plist")

echo "Verified Info.plist changes:"
echo "Marketing Version: $CURRENT_VERSION"
echo "Build Number: $CURRENT_BUILD"