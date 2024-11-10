#!/bin/sh

# export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods

# Install specific node version
brew install node@18
export PATH="/usr/local/opt/node@18/bin:$PATH"
export LDFLAGS="-L/usr/local/opt/node@18/lib"
export CPPFLAGS="-I/usr/local/opt/node@18/include"

# Install specific node version using n
npm install -g n
n 18.16.0

# Verify node version
node -v

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

# Verify the installation
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"