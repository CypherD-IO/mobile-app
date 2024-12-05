#!/bin/sh

# Prevent Homebrew from auto-cleanup
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Install CocoaPods using Homebrew
brew install cocoapods

# Install Node.js version 18.17.1 using nvm (Node Version Manager)
# Install nvm if not already installed
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
fi

# Load nvm and install Node.js 18.17.1
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

nvm install 18.17.1
nvm use 18.17.1
nvm alias default 18.17.1

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
PROJECT_DIR="$(pwd)/.."  # Goes up one level from ci_scripts to ios directory

echo "PROJECT_DIR: $PROJECT_DIR"
echo "Info.plist path: $PROJECT_DIR/Cypherd/Info.plist"

# Get version from environment variables
CURRENT_VERSION="${MARKETING_VERSION}"
CURRENT_BUILD="${CURRENT_PROJECT_VERSION}"

# Fallback to Info.plist values if env variables are not set
if [ -z "$CURRENT_VERSION" ]; then
    CURRENT_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$PROJECT_DIR/Cypherd/Info.plist")
    echo "Warning: MARKETING_VERSION not set in environment, using Info.plist value: $CURRENT_VERSION"
fi

if [ -z "$CURRENT_BUILD" ]; then
    CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PROJECT_DIR/Cypherd/Info.plist")
    echo "Warning: CURRENT_PROJECT_VERSION not set in environment, using Info.plist value: $CURRENT_BUILD"
fi

# Increment version if target branch is main
if [ "$CI_BRANCH" = "main" ]; then
    # Extract all three parts
    MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
    MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
    PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
    
    echo "Debug: MAJOR=$MAJOR MINOR=$MINOR PATCH=$PATCH"
    
    MINOR=$((MINOR + 1))
    if [ $MINOR -gt 99 ]; then
        MAJOR=$((MAJOR + 1))
        MINOR=0
    fi
    
    # If PATCH was empty (2-part version), don't include it in NEW_VERSION
    if [ -z "$PATCH" ]; then
        NEW_VERSION="$MAJOR.$MINOR"
    else
        NEW_VERSION="$MAJOR.$MINOR.$PATCH"
    fi
    CURRENT_VERSION=$NEW_VERSION
fi

# Update Info.plist values
if ! /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $CURRENT_VERSION" "$PROJECT_DIR/Cypherd/Info.plist"; then
    echo "Error: Failed to update CFBundleShortVersionString in Info.plist"
    exit 1
fi

if ! /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CURRENT_BUILD" "$PROJECT_DIR/Cypherd/Info.plist"; then
    echo "Error: Failed to update CFBundleVersion in Info.plist"
    exit 1
fi

# Verify the changes
echo "Verified Info.plist changes:"
echo "Marketing Version: $CURRENT_VERSION"
echo "Build Number: $CURRENT_BUILD"

# Create .env file in project root
cat > "$PROJECT_DIR/../.env" << EOL
SENTRY_DSN=${SENTRY_DSN}
ENVIRONMENT=${ENVIRONMENT}
INTERCOM_APP_KEY=${INTERCOM_APP_KEY}
WALLET_CONNECT_PROJECTID=${WALLET_CONNECT_PROJECTID}
EOL

echo "Created .env file with required variables"
cat "$PROJECT_DIR/../.env"

echo "Current working directory: $(pwd)"

# Use absolute paths with $CI_PRIMARY_REPOSITORY_PATH
GOOGLE_PLIST_PATH="${CI_PRIMARY_REPOSITORY_PATH}/ios/GoogleService-Info.plist"
SENTRY_PROPS_PATH="${CI_PRIMARY_REPOSITORY_PATH}/ios/sentry.properties"

if [ -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then 
    echo "Error: GOOGLE_SERVICE_INFO_PLIST environment variable is not set" 
    exit 1 
fi 

# Create a temporary file first
TEMP_PLIST="/tmp/GoogleService-Info.plist"
if ! echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > "$TEMP_PLIST"; then 
    echo "Error: Failed to decode GoogleService-Info.plist" 
    exit 1 
fi 

# Verify the plist is valid
if ! plutil -lint "$TEMP_PLIST"; then
    echo "Error: Invalid plist file created"
    cat "$TEMP_PLIST"  # This will show the content for debugging
    exit 1
fi

# If valid, move to final location
mv "$TEMP_PLIST" "$GOOGLE_PLIST_PATH"
chmod 644 "$GOOGLE_PLIST_PATH"  # Changed to 644 for read permissions

echo "Successfully created GoogleService-Info.plist at: $GOOGLE_PLIST_PATH"

# Similar changes for sentry.properties
if [ -z "$SENTRY_PROPERTIES" ]; then 
    echo "Error: SENTRY_PROPERTIES environment variable is not set" 
    exit 1 
fi 

if ! echo "$SENTRY_PROPERTIES" | base64 --decode > "$SENTRY_PROPS_PATH"; then 
    echo "Error: Failed to decode sentry.properties" 
    exit 1 
fi 

chmod 600 "$SENTRY_PROPS_PATH"
if [ ! -f "$SENTRY_PROPS_PATH" ]; then 
    echo "Error: Failed to create sentry.properties" 
    exit 1 
fi 

echo "Successfully created sentry.properties at: $SENTRY_PROPS_PATH"

# Verify files exist in the correct location
ls -la "${CI_PRIMARY_REPOSITORY_PATH}/ios/"
