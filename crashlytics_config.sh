#!/bin/bash
set -e

echo "info: Starting Crashlytics Configuration"

# Debug information
echo "DWARF_DSYM_FOLDER_PATH: ${DWARF_DSYM_FOLDER_PATH}"
echo "DWARF_DSYM_FILE_NAME: ${DWARF_DSYM_FILE_NAME}"
echo "PODS_ROOT: ${PODS_ROOT}"
echo "SRCROOT: ${SRCROOT}"
echo "BUILT_PRODUCTS_DIR: ${BUILT_PRODUCTS_DIR}"
echo "INFOPLIST_PATH: ${INFOPLIST_PATH}"

if [[ -d "${PODS_ROOT}/FirebaseCrashlytics" ]]; then
    echo "info: Setting execute permissions for Crashlytics scripts"
    chmod +x "${PODS_ROOT}/FirebaseCrashlytics/run"
    chmod +x "${PODS_ROOT}/FirebaseCrashlytics/upload-symbols"
    
    echo "info: Running FirebaseCrashlytics/run script"
    "${PODS_ROOT}/FirebaseCrashlytics/run" || {
        echo "warning: Crashlytics run script failed"
        exit 0
    }
else
    echo "error: FirebaseCrashlytics not found in Pods"
    echo "PODS_ROOT location: ${PODS_ROOT}"
    exit 0
fi