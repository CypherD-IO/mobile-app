#!/bin/sh

# export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use specific Node version
nvm install 18.16.0
nvm use 18.16.0

# Verify node version
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install --legacy-peer-deps

# Clean up and install pods
rm -rf /Volumes/workspace/DerivedData
pod deintegrate
rm -rf Pods
rm -rf Podfile.lock
pod install --repo-update
# the sed command from RN cant find the file... so we have to run it ourselves
# sed -i -e  $'s/ && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_10_0)//' /Volumes/workspace/repository/ios/Pods/RCT-Folly/folly/portability/Time.h

# Final verification
echo "Final Node version: $(node -v)"
echo "Final NPM version: $(npm -v)"