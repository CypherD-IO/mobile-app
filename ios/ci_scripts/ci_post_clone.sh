#!/bin/sh

# Fail fast in CI. Without this, `pod install` / `npm install` failures can be silently ignored,
# and Xcode later fails with missing `Pods-*.xcconfig` / `.xcfilelist` files during the Analyze/Build phase.
set -euo pipefail

# Prevent Homebrew from auto-cleanup
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

# Install CocoaPods using Homebrew
brew install cocoapods

# Install Node.js using nvm (Node Version Manager).
# Source of truth: repo root `.nvmrc` (used by both GitHub Actions and Xcode Cloud).
#
# IMPORTANT (Xcode Cloud):
# The upstream nvm install script tries to edit shell profile files (e.g. `.zshrc`) and can exit
# non-zero in CI even after successfully cloning nvm (we observed exit code 3). Because we run
# `set -e`, that would abort the build.
#
# Fix: install nvm in a CI-safe, non-interactive way (git clone + source), without touching `.zshrc`.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_GIT_TAG="v0.39.4"
if [ ! -d "$NVM_DIR" ]; then
  echo "Installing nvm (${NVM_GIT_TAG}) into ${NVM_DIR}..."
  # NOTE (Xcode Cloud):
  # Using `git clone --depth 1 --branch <tag>` can fail for annotated tags with:
  #   "refs/tags/<tag> ... is not a commit" (exit code 3)
  # The nvm tag we pin can be annotated, so prefer the release tarball approach in CI.
  mkdir -p "$NVM_DIR"
  curl -fsSL "https://github.com/nvm-sh/nvm/archive/refs/tags/${NVM_GIT_TAG}.tar.gz" \
    | tar -xz -C "$NVM_DIR" --strip-components=1
fi

# Load nvm for this script execution.
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Resolve repo root deterministically (Xcode Cloud does not guarantee the current working directory).
# - Prefer CI_PRIMARY_REPOSITORY_PATH when available.
# - Otherwise compute from this script location: ios/ci_scripts -> repo root (../..).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NVMRC_PATH="${REPO_ROOT}/.nvmrc"

# Always run installs from deterministic directories.
echo "Script dir: ${SCRIPT_DIR}"
echo "Repo root:   ${REPO_ROOT}"

# Try to get Node.js version from repo root .nvmrc, fallback to a known-good version if not found.
if [ -f "$NVMRC_PATH" ]; then
    NODE_VERSION="$(cat "$NVMRC_PATH" | tr -d ' \t\r\n')"
    echo "Found .nvmrc file at: $NVMRC_PATH"
    echo "Using Node.js version: $NODE_VERSION"
else
    NODE_VERSION="v22.12.0"
    echo "No .nvmrc found at: $NVMRC_PATH"
    echo "Falling back to Node.js version: $NODE_VERSION"
fi

# Normalize Node version to always include the leading "v" because some RN/Xcode scripts
# expect node to exist at `/Users/local/.nvm/versions/node/vX.Y.Z/bin/node`.
# Example failure:
#   Can't find '/Users/local/.nvm/versions/node/v18.17.1/bin/node'
# while `.nvmrc` may contain `18.17.1` (without the `v`).
case "$NODE_VERSION" in
  v*) NODE_VERSION_V="$NODE_VERSION" ;;
  *)  NODE_VERSION_V="v$NODE_VERSION" ;;
esac

nvm install "$NODE_VERSION_V"
nvm use "$NODE_VERSION_V"
nvm alias default "$NODE_VERSION_V"

# Verify Node.js version
node -v

# Some RN scripts in CI expect a node binary to exist under /Users/local/.nvm.
# Ensure the target directory exists before we symlink.
NODE_BIN="$(which node)"

# Create the "vX.Y.Z" path (expected by many RN templates / node-binary.sh failures)
sudo mkdir -p "/Users/local/.nvm/versions/node/${NODE_VERSION_V}/bin/"
sudo ln -sf "$NODE_BIN" "/Users/local/.nvm/versions/node/${NODE_VERSION_V}/bin/node"

# Also create the "X.Y.Z" path for backwards compatibility with any scripts that omit the "v".
NODE_VERSION_NO_V="${NODE_VERSION_V#v}"
sudo mkdir -p "/Users/local/.nvm/versions/node/${NODE_VERSION_NO_V}/bin/"
sudo ln -sf "$NODE_BIN" "/Users/local/.nvm/versions/node/${NODE_VERSION_NO_V}/bin/node"

NODE_PATH="$NODE_BIN"

# Print the Node.js path for debugging purposes
echo "Node.js binary is located at: $NODE_PATH"

# Export NODE_BINARY for Xcode to use
export NODE_BINARY=$NODE_PATH

# Install JS dependencies from repo root (package.json lives there).
cd "$REPO_ROOT"
npm install --legacy-peer-deps

# Clean up DerivedData folder if it exists
rm -rf /Volumes/workspace/DerivedData

# Deintegrate and reinstall CocoaPods dependencies from `ios/`
cd "${REPO_ROOT}/ios"
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

# Use absolute paths with resolved repo root (CI_PRIMARY_REPOSITORY_PATH is not guaranteed).
GOOGLE_PLIST_PATH="${REPO_ROOT}/ios/GoogleService-Info.plist"
SENTRY_PROPS_PATH="${REPO_ROOT}/ios/sentry.properties"

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

# Verify key Pods outputs exist (these are what Xcode complains about when missing).
echo "Verifying CocoaPods outputs..."
ls -la "${REPO_ROOT}/ios/Pods/Target Support Files/Pods-Cypherd/" | cat

# Verify files exist in the correct location
ls -la "${REPO_ROOT}/ios/" | cat
