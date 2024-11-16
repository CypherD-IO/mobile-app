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

# Install dependencies with npm, using legacy-peer-deps if needed
npm install --legacy-peer-deps

# Clean up DerivedData folder if it exists
rm -rf /Volumes/workspace/DerivedData

# Deintegrate and reinstall CocoaPods dependencies
pod deintegrate
pod install --repo-update

# The sed command from React Native that needs to be run manually (uncomment if needed)
# sed -i -e $'s/ && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_10_0)//' /Volumes/workspace/repository/ios/Pods/RCT-Folly/folly/portability/Time.h