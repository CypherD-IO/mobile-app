#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/assets/fonts"
ANDROID_FONT_DIR="$ROOT_DIR/android/app/src/main/res/font"
ANDROID_LINK_MANIFEST="$ROOT_DIR/android/link-assets-manifest.json"
IOS_LINK_MANIFEST="$ROOT_DIR/ios/link-assets-manifest.json"
CLEAN_ANDROID_RESOURCES=false
BACKUP_DIR=""

for arg in "$@"; do
  case "$arg" in
    --clean-android-font-resources)
      CLEAN_ANDROID_RESOURCES=true
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [--clean-android-font-resources]"
      exit 1
      ;;
  esac
done

if [ ! -d "$ASSETS_DIR" ]; then
  echo "Missing fonts directory: $ASSETS_DIR"
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run react-native-asset"
  exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules/@callstack/react-native-asset" ]; then
  echo "Missing dependency: @callstack/react-native-asset"
  echo "Run: npm install"
  exit 1
fi

shopt -s nullglob
font_files=("$ASSETS_DIR"/*.ttf "$ASSETS_DIR"/*.otf)
shopt -u nullglob

if [ "${#font_files[@]}" -eq 0 ]; then
  echo "No .ttf or .otf files found in $ASSETS_DIR"
  exit 1
fi

if [ "$CLEAN_ANDROID_RESOURCES" = true ]; then
  echo "Cleaning Android font resources directory..."
  echo "Resetting react-native-asset manifests to force full relink..."
  rm -f "$ANDROID_LINK_MANIFEST" "$IOS_LINK_MANIFEST"
  BACKUP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cypherd-font-backup.XXXXXX")"
  if [ -d "$ANDROID_FONT_DIR" ]; then
    cp -R "$ANDROID_FONT_DIR/." "$BACKUP_DIR/" 2>/dev/null || true
  fi
  rm -rf "$ANDROID_FONT_DIR"
  mkdir -p "$ANDROID_FONT_DIR"
else
  echo "Keeping existing Android font resources (non-destructive mode)."
  mkdir -p "$ANDROID_FONT_DIR"
fi

echo "Linking fonts from assets/fonts with react-native-asset..."
if ! (
  cd "$ROOT_DIR"
  npx --no-install react-native-asset
); then
  if [ "$CLEAN_ANDROID_RESOURCES" = true ] && [ -n "$BACKUP_DIR" ]; then
    rm -rf "$ANDROID_FONT_DIR"
    mkdir -p "$ANDROID_FONT_DIR"
    cp -R "$BACKUP_DIR/." "$ANDROID_FONT_DIR/" 2>/dev/null || true
  fi
  echo "Font linking failed."
  exit 1
fi

shopt -s nullglob
generated_android_fonts=("$ANDROID_FONT_DIR"/*.xml "$ANDROID_FONT_DIR"/*.ttf "$ANDROID_FONT_DIR"/*.otf)
shopt -u nullglob

if [ "${#generated_android_fonts[@]}" -eq 0 ]; then
  if [ "$CLEAN_ANDROID_RESOURCES" = true ] && [ -n "$BACKUP_DIR" ]; then
    rm -rf "$ANDROID_FONT_DIR"
    mkdir -p "$ANDROID_FONT_DIR"
    cp -R "$BACKUP_DIR/." "$ANDROID_FONT_DIR/" 2>/dev/null || true
    echo "No Android fonts were generated. Restored previous android font resources."
  else
    echo "No Android fonts were generated."
  fi
  echo "Check that assets/fonts contains all required .ttf/.otf files."
  exit 1
fi

resolve_android_font_resource_collisions() {
  local font_file
  local xml_file
  local base
  local ext
  local new_base
  local new_file
  local tmp_file
  local suffix_index

  shopt -s nullglob
  for font_file in "$ANDROID_FONT_DIR"/*.ttf "$ANDROID_FONT_DIR"/*.otf; do
    base="$(basename "${font_file%.*}")"
    ext="${font_file##*.}"
    xml_file="$ANDROID_FONT_DIR/$base.xml"

    # Android resources cannot contain both @font/<name>.xml and @font/<name>.ttf.
    if [ -f "$xml_file" ]; then
      new_base="${base}_regular"
      suffix_index=1
      while [ -e "$ANDROID_FONT_DIR/${new_base}.${ext}" ] || [ -e "$ANDROID_FONT_DIR/${new_base}.xml" ]; do
        new_base="${base}_regular_${suffix_index}"
        suffix_index=$((suffix_index + 1))
      done

      new_file="$ANDROID_FONT_DIR/${new_base}.${ext}"
      mv "$font_file" "$new_file"

      tmp_file="$(mktemp)"
      sed "s#@font/${base}\"#@font/${new_base}\"#g" "$xml_file" > "$tmp_file"
      mv "$tmp_file" "$xml_file"

      echo "Resolved Android font duplicate resource name: ${base}.${ext} -> ${new_base}.${ext}"
    fi
  done
  shopt -u nullglob
}

resolve_android_font_resource_collisions

if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
  rm -rf "$BACKUP_DIR"
fi

echo
echo "Font sync complete."
echo "Generated Android resources:"
ls -1 "$ANDROID_FONT_DIR" || true
echo
echo "Review and commit these generated files:"
echo "  android/app/src/main/res/font/*"
echo "  ios/Cypherd/Info.plist"
echo "  ios/Cypherd.xcodeproj/project.pbxproj"
