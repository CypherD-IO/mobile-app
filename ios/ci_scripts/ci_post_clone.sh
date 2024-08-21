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

# create a .npmrc file with the npm token
echo "@cypherd-io:registry=https://npm.pkg.github.com/" > .npmrc
echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc

# Install dependencies you manage with CocoaPods.
echo "installing packages"
npm install --legacy-peer-deps

pod --version

echo "pod installing"
pod install

# the sed command from RN cant find the file... so we have to run it ourselves
# echo "sed command"
# sed -i -e  $'s/ && (__IPHONE_OS_VERSION_MIN_REQUIRED < __IPHONE_10_0)//' /Volumes/workspace/repository/ios/Pods/RCT-Folly/folly/portability/Time.h

