#!/bin/bash

###############################################################################
# Quick Font Fixer Script
#
# Alternative to fix-font.py using FontForge's command-line mode
# Use this if the Python script has issues
#
# Usage:
#   ./scripts/fix-font-quick.sh assets/fonts/CydFont.ttf
#   ./scripts/fix-font-quick.sh assets/fonts/CydFont.ttf assets/fonts/CydFont_fixed.ttf
###############################################################################

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input.ttf> [output.ttf]"
    echo ""
    echo "If output.ttf is not specified, input file will be overwritten"
    echo "(a backup will be created first)"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-$INPUT_FILE}"

if [ ! -f "$INPUT_FILE" ]; then
    echo "ERROR: Input file not found: $INPUT_FILE"
    exit 1
fi

echo "====================================="
echo " FontForge Quick Font Fixer"
echo "====================================="
echo ""
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""

# Create backup if overwriting
if [ "$OUTPUT_FILE" == "$INPUT_FILE" ]; then
    BACKUP="${INPUT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Creating backup: $BACKUP"
    cp "$INPUT_FILE" "$BACKUP"
    echo ""
fi

# Run FontForge with fixing commands
fontforge -lang=ff -c '
Open($1);

# Fix all glyphs
SelectAll();

# Remove overlapping paths
Print("Removing overlapping paths...");
RemoveOverlap();

# Correct path direction
Print("Correcting path direction...");
CorrectDirection();

# Round to integers
Print("Rounding coordinates...");
RoundToInt();

# Add extrema points
Print("Adding extrema points...");
AddExtrema();

# Simplify paths
Print("Simplifying paths...");
Simplify(1.5, 1);

# Clear whitespace glyphs
Print("Clearing whitespace glyphs...");

if (InFont("space"))
    Select("space");
    Clear();
    SetWidth(512);
endif;

if (InFont("uni0000"))
    Select("uni0000");
    Clear();
    SetWidth(0);
endif;

if (InFont("uni0001"))
    Select("uni0001");
    Clear();
    SetWidth(0);
endif;

if (InFont("uni00A0"))
    Select("uni00A0");
    Clear();
    SetWidth(512);
endif;

# Fix .notdef glyph
Print("Fixing .notdef glyph...");
if (InFont(".notdef"))
    Select(".notdef");
    # Check if empty (you may need to manually add a glyph if this does not work)
    # For now just ensure it has proper width
    SetWidth(500);
endif;

# Fix metrics
Print("Fixing font metrics...");
SetOS2Value("TypoLineGap", 0);

# Auto-hint
Print("Auto-hinting...");
SelectAll();
AutoHint();

# Generate fixed font
Print("Generating font: " + $2);
Generate($2, "", ("opentype", "round", "dummy-dsig"));

Print("Done!");
' "$INPUT_FILE" "$OUTPUT_FILE" 2>&1

echo ""
echo "====================================="
echo " ✓ Font fixing complete!"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Validate with: ots-sanitize '$OUTPUT_FILE'"
echo "2. Check with: fontbakery check-universal '$OUTPUT_FILE'"
echo "3. Copy to project:"
echo "   cp '$OUTPUT_FILE' assets/fonts/CydFont.ttf"
echo "   cp '$OUTPUT_FILE' android/app/src/main/assets/fonts/CydFont.ttf"
echo "   cp '$OUTPUT_FILE' android/app/src/main/res/font/cydfont.ttf"
echo ""


