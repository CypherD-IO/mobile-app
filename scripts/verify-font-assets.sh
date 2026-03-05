#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "android/app/src/main/res/font"
  "ios/Cypherd/Info.plist"
  "ios/Cypherd.xcodeproj/project.pbxproj"
)

cd "$ROOT_DIR"

has_tracked_target_changes() {
  ! git diff --quiet -- "${TARGETS[@]}" || ! git diff --cached --quiet -- "${TARGETS[@]}"
}

has_untracked_target_changes() {
  local untracked_files
  untracked_files="$(git ls-files --others --exclude-standard -- "${TARGETS[@]}")"
  [ -n "$untracked_files" ]
}

if has_tracked_target_changes || has_untracked_target_changes; then
  echo "Font-generated files already have local changes (tracked or untracked)."
  echo "Commit or stash those files before running fonts:check."
  exit 1
fi

bash "$ROOT_DIR/scripts/sync-font-assets.sh" >/dev/null

if has_tracked_target_changes || has_untracked_target_changes; then
  echo "Font assets are out of sync."
  echo "Run npm run fonts:setup and commit the updated files."
  echo
  echo "Changed generated files:"
  git diff --name-only -- "${TARGETS[@]}"
  git diff --cached --name-only -- "${TARGETS[@]}"
  git ls-files --others --exclude-standard -- "${TARGETS[@]}"
  exit 1
fi

echo "Font assets are in sync."
