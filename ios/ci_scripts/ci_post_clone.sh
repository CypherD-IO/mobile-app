#!/bin/sh
chmod +x ci_post_clone.sh

echo "exporting HOMEBREW_NO_INSTALL_CLEANUP=TRUE"
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "installing cocoapods"
brew install cocoapods

# have to add node yourself
echo "installing node@18"
brew install node@18

# link it to the path
echo "linking node@18"
brew link node@18

echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc

# Verify NPM_TOKEN
echo "NPM_TOKEN: ${NPM_TOKEN:0:10}..."

# Configure npm to use the token
echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" > ~/.npmrc
echo "@cypherd-io:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Set npm config
npm config set @cypherd-io:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken ${NPM_TOKEN}

# Debug npm configuration
echo "Debugging npm configuration:"
npm config list

# Clear npm cache
echo "Clearing npm cache"
npm cache clean --force

# Install dependencies
echo "Installing packages"
npm ci --legacy-peer-deps --verbose

pod --version

echo "pod installing"
pod install

