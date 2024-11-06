#!/bin/sh
chmod +x ci_post_clone.sh

echo "exporting HOMEBREW_NO_INSTALL_CLEANUP=TRUE"
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "installing cocoapods"
brew install cocoapods

# have to add node yourself
echo "installing node@18"
brew install node@18

# linking it to the path
echo "linking node@18"
brew link node@18

# Clear npm cache
echo "Clearing npm cache"
npm cache clean --force

# Install dependencies
echo "Installing packages"
npm ci --legacy-peer-deps

# Pod install
echo "pod installing"
pod install