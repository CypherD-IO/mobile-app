#!/bin/sh

# Fail fast in CI. Without this, `pod install` / `npm install` failures can be silently ignored,
# and Xcode later fails with missing `Pods-*.xcconfig` / `.xcfilelist` files during the Analyze/Build phase.
set -euo pipefail

# Prevent Homebrew from auto-cleanup, and from auto-updating on every invocation.
#
# HOMEBREW_NO_AUTO_UPDATE=1 is load-bearing in CI: on each `brew` invocation,
# Homebrew normally self-updates, and that self-update tries to fetch a fresher
# `portable-ruby` bottle from `ghcr.io` (redirected to
# `pkg-containers.githubusercontent.com`). Xcode Cloud workers cannot resolve
# those hosts — the same DNS wall documented for node@22 below — so leaving
# auto-update on causes `curl: (6) Could not resolve host` failures that abort
# the entire script before any real work runs.
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1

# ================================================================================
# CocoaPods: use the version pre-installed on the Xcode Cloud image.
# ================================================================================
#
# Why not Bundler? A previous attempt installed cocoapods via Bundler to avoid
# ghcr.io. It looked clean on paper but failed in practice: the Xcode Cloud
# worker's only Ruby on PATH is system Ruby 2.6.10 at `/usr/bin/ruby`, and
# modern cocoapods (>= 1.15) plus its transitive gems (activesupport 7.2+,
# concurrent-ruby 1.3+) require Ruby >= 3.1. Running `bundle install` under
# Ruby 2.6.10 fails either at lockfile activation (BUNDLED WITH) or at gem
# load. There is no reachable path to a modern Ruby on this image: brew
# bottles live on ghcr.io (blocked) and rbenv/nvm fetch from GitHub tarballs
# (also blocked). So Bundler is not viable for CocoaPods on Xcode Cloud.
#
# Why not `brew install cocoapods` unconditionally? Homebrew bottles are
# served from ghcr.io, so a fresh install has to fetch a bottle and fails.
#
# Strategy: rely on the worker's pre-installed cocoapods (same shape as the
# node@22 guard below). If a future image drops the pre-install, the brew
# fallback will likely still fail (bottle fetch), but the diagnostic block
# will dump enough state to pick a new strategy without blind guessing. The
# cocoapods version is still pinned for reproducibility — we assert that
# `pod --version` matches `ios/Podfile.lock`'s `COCOAPODS:` footer further
# down, so image drift surfaces immediately with a clear error.
# ================================================================================
if ! brew list cocoapods >/dev/null 2>&1; then
  echo "cocoapods not pre-installed on this image — attempting fallback install..."
  if ! brew install cocoapods; then
    echo ""
    echo "========================================================================"
    echo "CocoaPods is neither pre-installed nor reachable via brew. Diagnostics:"
    echo "========================================================================"
    echo "-- which pod (if any):"
    command -v pod || echo "  pod: not on PATH"
    echo "-- which ruby, version:"
    command -v ruby || echo "  ruby: not on PATH"
    ruby -v || true
    echo "-- brew opt rubies:"
    ls /usr/local/opt 2>/dev/null | grep -i ruby || echo "  none under /usr/local/opt"
    echo "-- brew cellar rubies:"
    ls /usr/local/Cellar 2>/dev/null | grep -i ruby || echo "  none under /usr/local/Cellar"
    echo "-- rbenv / asdf:"
    command -v rbenv || echo "  rbenv: absent"
    command -v asdf || echo "  asdf: absent"
    echo "========================================================================"
    echo "ACTION: investigate whether Apple has added a modern Ruby to the image."
    echo "If so, switch CocoaPods install to Bundler under that Ruby."
    echo "========================================================================"
    exit 1
  fi
fi

# ================================================================================
# Use the Node.js that Xcode Cloud's macOS image already ships with.
# ================================================================================
#
# Xcode Cloud's worker image pre-installs `node@22` via Homebrew (a recent
# successful build showed `/usr/local/Cellar/node@22/22.22.2` and
# `/usr/local/bin/node`), so the only thing we actually need to do here is
# make sure the `node`/`npm` symlinks are in place.
#
# We deliberately do NOT run an unconditional `brew install node@22` because:
#
#   - Apple's image pins `node@22` at upstream version 22.22.2, but the
#     Homebrew formula recently shipped a revision bump (22.22.2_1, same
#     upstream, rebuilt bottle).
#   - An unconditional `brew install node@22` then sees "installed version
#     older than formula" and tries to UPGRADE to 22.22.2_1, which forces
#     a fresh bottle fetch from `ghcr.io`.
#   - Xcode Cloud cannot resolve `ghcr.io`
#     (`curl: (6) Could not resolve host: ghcr.io`), so the upgrade — and
#     therefore the entire build — fails.
#
# Guarding the install on `brew list node@22` makes us a no-op when the
# image already has it (the common case today) and only falls back to
# installing when a future image drops the pre-install. The `brew link` is
# kept (with `|| true` for the harmless "Already linked" warning) so we
# still get `node`/`npm` on PATH whether the install ran or not.
#
# History note: an earlier version of this script used nvm, which was
# abandoned because Xcode Cloud blocks GitHub tarball/git downloads
# (exit code 3) that nvm needs to fetch its release archives.
# ================================================================================
if ! brew list node@22 >/dev/null 2>&1; then
  echo "node@22 not pre-installed on this image — installing via Homebrew..."
  brew install node@22
else
  echo "Using pre-installed node@22 from Xcode Cloud image."
fi

# Link node@22 so it's available as `node`/`npm`/`npx` on PATH.
# `|| true` swallows the harmless "Already linked" warning when the image
# already linked it for us.
brew link --overwrite node@22 || true

# Resolve repo root deterministically (Xcode Cloud does not guarantee the current working directory).
# - Prefer CI_PRIMARY_REPOSITORY_PATH when available.
# - Otherwise compute from this script location: ios/ci_scripts -> repo root (../..).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Always run installs from deterministic directories.
echo "Script dir: ${SCRIPT_DIR}"
echo "Repo root:   ${REPO_ROOT}"

# Verify Node.js version
echo "Node.js version:"
node -v
echo "npm version:"
npm -v
echo "Node.js binary: $(which node)"

# Install JS dependencies from repo root (package.json lives there).
cd "$REPO_ROOT"
npm install --legacy-peer-deps

# ================================================================================
# CocoaPods version assertion: fail fast if the image's pre-installed pod has
# drifted from what ios/Podfile.lock was generated with.
# ================================================================================
#
# ios/Podfile.lock's last line records the cocoapods version used to generate
# it (e.g., `COCOAPODS: 1.16.2`). If the worker's installed pod differs, the
# install may succeed but produce subtly different outputs that break the
# build later. Catch that drift now with a clear message, before `pod install`
# runs.
# ================================================================================
EXPECTED_POD_VERSION="$(awk '/^COCOAPODS:/ {print $2}' "${REPO_ROOT}/ios/Podfile.lock")"
ACTUAL_POD_VERSION="$(pod --version)"
if [ -z "$EXPECTED_POD_VERSION" ]; then
  echo "WARNING: could not parse COCOAPODS version from ios/Podfile.lock — skipping version check."
elif [ "$EXPECTED_POD_VERSION" != "$ACTUAL_POD_VERSION" ]; then
  echo "ERROR: CocoaPods version mismatch."
  echo "  Podfile.lock expects: ${EXPECTED_POD_VERSION}"
  echo "  Image provides:       ${ACTUAL_POD_VERSION}"
  echo ""
  echo "Either:"
  echo "  - Regenerate ios/Podfile.lock under cocoapods ${ACTUAL_POD_VERSION} and commit, OR"
  echo "  - Pin cocoapods ${EXPECTED_POD_VERSION} explicitly in the image."
  exit 1
fi
echo "CocoaPods version: ${ACTUAL_POD_VERSION} (matches ios/Podfile.lock)"

# Clean up DerivedData folder if it exists
rm -rf /Volumes/workspace/DerivedData

# Deintegrate and reinstall CocoaPods dependencies from `ios/` using the
# pre-installed pod verified above.
cd "${REPO_ROOT}/ios"
pod deintegrate
pod install --repo-update


# Create .env file in project root (REPO_ROOT, not relative to current directory)
echo "Creating .env file at: ${REPO_ROOT}/.env"
cat > "${REPO_ROOT}/.env" << EOL
SENTRY_DSN=${SENTRY_DSN}
ENVIRONMENT=${ENVIRONMENT}
INTERCOM_APP_KEY=${INTERCOM_APP_KEY}
INTERCOM_IOS_SDK_KEY=${INTERCOM_IOS_SDK_KEY}
MOBILE_WALLETKIT_PROJECTID=${MOBILE_WALLETKIT_PROJECTID}
MOBILE_APPKIT_PROJECTID=${MOBILE_APPKIT_PROJECTID}
RA_PUB_KEY=${RA_PUB_KEY}
HELIUS_API_KEY=${HELIUS_API_KEY}
WEB3_AUTH_CLIENT_ID=${WEB3_AUTH_CLIENT_ID}
EOL

# Verify .env was created
if [ -f "${REPO_ROOT}/.env" ]; then
  echo "✓ .env file created successfully"
  echo "  Lines: $(wc -l < "${REPO_ROOT}/.env")"
else
  echo "ERROR: Failed to create .env file!"
  exit 1
fi

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
