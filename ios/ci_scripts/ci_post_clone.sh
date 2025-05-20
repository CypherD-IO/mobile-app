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

# Try to get Node.js version from .nvmrc, fallback to default if not found
if [ -f "../.nvmrc" ]; then
    NODE_VERSION=$(cat "../.nvmrc")
    echo "Found .nvmrc file, using Node.js version: $NODE_VERSION"
else
    NODE_VERSION="18.17.1"
    echo "No .nvmrc file found, using default Node.js version: $NODE_VERSION"
fi

nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION

# Verify Node.js version
node -v

sudo ln -sf $(which node) /Users/local/.nvm/versions/node/$NODE_VERSION/bin/node

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


# Define PROJECT_DIR relative to script location
PROJECT_DIR="$(pwd)/.."  # Goes up one level from ci_scripts to ios directory

# Create .env file in project root
cat > "$PROJECT_DIR/../.env" << EOL
SENTRY_DSN=${SENTRY_DSN}
ENVIRONMENT=${ENVIRONMENT}
INTERCOM_APP_KEY=${INTERCOM_APP_KEY}
WALLET_CONNECT_PROJECTID=${WALLET_CONNECT_PROJECTID}
RA_PUB_KEY=${RA_PUB_KEY}
HELIUS_API_KEY=${HELIUS_API_KEY}
EOL

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
