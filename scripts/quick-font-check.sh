#!/bin/bash

###############################################################################
# Quick Font Check Script
#
# A simplified script for quick validation of font files
# Use this for fast checks during development
#
# Usage: ./scripts/quick-font-check.sh <font_file>
###############################################################################

if [ $# -eq 0 ]; then
    echo "Usage: $0 <font_file>"
    echo "Example: $0 assets/fonts/CydFont.ttf"
    exit 1
fi

FONT_FILE="$1"

if [ ! -f "$FONT_FILE" ]; then
    echo "❌ Error: Font file not found: $FONT_FILE"
    exit 1
fi

echo "🔍 Quick Font Check: $(basename "$FONT_FILE")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: File command
echo "1️⃣  File Type Check"
FILE_TYPE=$(file -b "$FONT_FILE")
echo "   $FILE_TYPE"

if [[ "$FILE_TYPE" =~ "TrueType" ]]; then
    echo "   ✅ Valid TrueType font"
else
    echo "   ❌ Not a valid TrueType font!"
    exit 1
fi
echo ""

# Check 2: File size
echo "2️⃣  File Size Check"
SIZE=$(wc -c < "$FONT_FILE" | tr -d ' ')
SIZE_KB=$((SIZE / 1024))
echo "   Size: $SIZE bytes (${SIZE_KB}KB)"

if [ "$SIZE" -lt 1024 ]; then
    echo "   ❌ Too small - likely corrupted"
    exit 1
elif [ "$SIZE" -lt 10240 ]; then
    echo "   ⚠️  Very small - verify this is correct"
elif [ "$SIZE" -gt 1048576 ]; then
    echo "   ⚠️  Very large - may contain unnecessary data"
else
    echo "   ✅ Size looks reasonable"
fi
echo ""

# Check 3: Magic number
echo "3️⃣  Magic Number Check"
MAGIC=$(xxd -l 4 -p "$FONT_FILE" 2>/dev/null)
echo "   Magic: 0x$MAGIC"

if [[ "$MAGIC" == "00010000" ]]; then
    echo "   ✅ Valid TrueType magic number"
elif [[ "$MAGIC" == "4f54544f" ]]; then
    echo "   ✅ Valid OpenType magic number (OTTO)"
else
    echo "   ❌ Invalid magic number!"
    exit 1
fi
echo ""

# Check 4: fc-validate (if available)
if command -v fc-validate &> /dev/null; then
    echo "4️⃣  FontConfig Validation"
    if fc-validate "$FONT_FILE" 2>&1 | grep -q "^$FONT_FILE:0 OK"; then
        echo "   ✅ FontConfig validation passed"
    else
        echo "   ⚠️  FontConfig reports issues:"
        fc-validate "$FONT_FILE" 2>&1 | sed 's/^/   /'
    fi
    echo ""
fi

# Check 5: Compare with old version (for CydFont.ttf only)
if [[ "$(basename "$FONT_FILE")" == "CydFont.ttf" ]]; then
    OLD_FONT="/tmp/CydFont_old.ttf"
    if [ -f "$OLD_FONT" ]; then
        echo "5️⃣  Comparison with Old Working Version"
        
        OLD_SIZE=$(wc -c < "$OLD_FONT" | tr -d ' ')
        DIFF=$((SIZE - OLD_SIZE))
        
        echo "   Old size: $OLD_SIZE bytes"
        echo "   New size: $SIZE bytes"
        echo "   Difference: $DIFF bytes"
        
        if [ "$DIFF" -eq 0 ]; then
            echo "   ✅ Same size as working version"
        elif [ "$DIFF" -gt 0 ]; then
            echo "   ⚠️  $DIFF bytes larger than working version"
        else
            echo "   ⚠️  ${DIFF#-} bytes smaller than working version"
        fi
        
        # Compare checksums
        NEW_SHA=$(shasum -a 256 "$FONT_FILE" | cut -d' ' -f1)
        OLD_SHA=$(shasum -a 256 "$OLD_FONT" | cut -d' ' -f1)
        
        if [ "$NEW_SHA" == "$OLD_SHA" ]; then
            echo "   ✅ Identical to working version"
        else
            echo "   ℹ️  Different checksum (expected if regenerated)"
        fi
        echo ""
    else
        echo "5️⃣  Old Version Not Available"
        echo "   ℹ️  Run this to extract old version for comparison:"
        echo "   git show 96db3d11~1:assets/fonts/CydFont.ttf > /tmp/CydFont_old.ttf"
        echo ""
    fi
fi

# Final verdict
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Quick checks passed!"
echo ""
echo "ℹ️  For comprehensive validation, run:"
echo "   ./scripts/validate-fonts.sh $FONT_FILE"


