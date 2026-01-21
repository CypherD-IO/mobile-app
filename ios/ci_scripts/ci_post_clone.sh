#!/bin/sh

# Prevent Homebrew from auto-cleanup
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Install CocoaPods using Homebrew
brew install cocoapods

# Install Node.js using nvm (Node Version Manager).
# Source of truth: repo root `.nvmrc` (used by both GitHub Actions and Xcode Cloud).
# Install nvm if not already installed
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
fi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# Resolve repo root deterministically (Xcode Cloud does not guarantee the current working directory).
# - Prefer CI_PRIMARY_REPOSITORY_PATH when available.
# - Otherwise compute from this script location: ios/ci_scripts -> repo root (../..).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NVMRC_PATH="${REPO_ROOT}/.nvmrc"

# Try to get Node.js version from repo root .nvmrc, fallback to a known-good version if not found.
if [ -f "$NVMRC_PATH" ]; then
    NODE_VERSION=$(cat "$NVMRC_PATH")
    echo "Found .nvmrc file at: $NVMRC_PATH"
    echo "Using Node.js version: $NODE_VERSION"
else
    NODE_VERSION="v22.12.0"
    echo "No .nvmrc found at: $NVMRC_PATH"
    echo "Falling back to Node.js version: $NODE_VERSION"
fi

nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION

# Verify Node.js version
node -v

# Some RN scripts in CI expect a node binary to exist under /Users/local/.nvm.
# Ensure the target directory exists before we symlink.
sudo mkdir -p /Users/local/.nvm/versions/node/$NODE_VERSION/bin/
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
INTERCOM_IOS_SDK_KEY=${INTERCOM_IOS_SDK_KEY}
WALLET_CONNECT_PROJECTID=${WALLET_CONNECT_PROJECTID}
RA_PUB_KEY=${RA_PUB_KEY}
HELIUS_API_KEY=${HELIUS_API_KEY}
WEB3_AUTH_CLIENT_ID=${WEB3_AUTH_CLIENT_ID}
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
