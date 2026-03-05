#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "android/app/src/main/res/font"
  "ios/Cypherd/Info.plist"
  "ios/Cypherd.xcodeproj/project.pbxproj"
)

cd "$ROOT_DIR"

if ! git diff --quiet -- "${TARGETS[@]}" || ! git diff --cached --quiet -- "${TARGETS[@]}"; then
  echo "Font-generated files already have local changes."
  echo "Commit or stash those files before running fonts:check."
  exit 1
fi

bash "$ROOT_DIR/scripts/sync-font-assets.sh" >/dev/null

if ! git diff --quiet -- "${TARGETS[@]}"; then
  echo "Font assets are out of sync."
  echo "Run npm run fonts:setup and commit the updated files."
  echo
  echo "Changed generated files:"
  git diff --name-only -- "${TARGETS[@]}"
  exit 1
fi

echo "Font assets are in sync."
