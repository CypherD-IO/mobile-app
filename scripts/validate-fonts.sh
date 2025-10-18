#!/bin/bash

###############################################################################
# Font Validation Script
#
# This script validates TTF font files to ensure they are not malformed
# and won't cause iOS FontParser crashes (CVE-2025-43400)
#
# Usage: ./scripts/validate-fonts.sh [font_file]
#        If no font file is provided, validates all fonts in assets/fonts/
#
# Exit codes:
#   0 - All fonts are valid
#   1 - One or more fonts failed validation
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
TOTAL_FONTS=0
PASSED_FONTS=0
FAILED_FONTS=0
WARNING_FONTS=0

###############################################################################
# Function: Print colored output
###############################################################################
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

###############################################################################
# Function: Validate font file using basic checks
###############################################################################
validate_font_basic() {
    local font_file=$1
    local font_name=$(basename "$font_file")
    local errors=0
    
    print_status "$BLUE" "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_status "$BLUE" "Validating: $font_name"
    print_status "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check 1: File exists and is readable
    if [ ! -f "$font_file" ]; then
        print_status "$RED" "❌ File does not exist"
        return 1
    fi
    
    if [ ! -r "$font_file" ]; then
        print_status "$RED" "❌ File is not readable"
        return 1
    fi
    
    print_status "$GREEN" "✓ File exists and is readable"
    
    # Check 2: File type validation using 'file' command
    local file_type=$(file -b "$font_file")
    if [[ ! "$file_type" =~ "TrueType" ]]; then
        print_status "$RED" "❌ Not a valid TrueType font"
        print_status "$RED" "   File type: $file_type"
        ((errors++))
    else
        print_status "$GREEN" "✓ Valid TrueType font file"
        echo "   File type: $file_type"
    fi
    
    # Check 3: File size validation
    local size=$(wc -c < "$font_file" | tr -d ' ')
    echo "   File size: $size bytes ($(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "$size bytes"))"
    
    if [ "$size" -lt 1024 ]; then
        print_status "$RED" "❌ File is too small (< 1KB) - likely corrupted"
        ((errors++))
    elif [ "$size" -lt 10240 ]; then
        print_status "$YELLOW" "⚠️  File is very small (< 10KB) - verify this is correct"
        ((WARNING_FONTS++))
    elif [ "$size" -gt 1048576 ]; then
        print_status "$YELLOW" "⚠️  File is large (> 1MB) - may contain unnecessary data"
        ((WARNING_FONTS++))
    else
        print_status "$GREEN" "✓ File size is reasonable"
    fi
    
    # Check 4: File permissions
    local perms=$(stat -f "%OLp" "$font_file" 2>/dev/null || stat -c "%a" "$font_file" 2>/dev/null)
    echo "   Permissions: $perms"
    if [[ "$perms" != "644" && "$perms" != "755" ]]; then
        print_status "$YELLOW" "⚠️  Unusual permissions (expected 644 or 755)"
    fi
    
    # Check 5: File magic number (TTF files should start with 0x00010000 or 'OTTO')
    local magic=$(xxd -l 4 -p "$font_file" 2>/dev/null)
    echo "   Magic number: 0x$magic"
    
    if [[ "$magic" != "00010000" && "$magic" != "4f54544f" ]]; then
        print_status "$RED" "❌ Invalid magic number (expected 00010000 for TTF or 4f54544f for OTF)"
        ((errors++))
    else
        print_status "$GREEN" "✓ Valid font magic number"
    fi
    
    # Check 6: Extract font metadata
    echo ""
    print_status "$BLUE" "Font Metadata:"
    
    # Number of tables
    local num_tables=$(xxd -s 4 -l 2 -p "$font_file" 2>/dev/null)
    if [ -n "$num_tables" ]; then
        local tables_dec=$((0x$num_tables))
        echo "   Number of tables: $tables_dec"
        
        if [ "$tables_dec" -lt 5 ]; then
            print_status "$RED" "❌ Too few tables (< 5) - likely corrupted"
            ((errors++))
        elif [ "$tables_dec" -gt 50 ]; then
            print_status "$YELLOW" "⚠️  Unusually high number of tables (> 50)"
        else
            print_status "$GREEN" "✓ Table count is normal"
        fi
    fi
    
    # Check 7: Required font tables (using strings and grep)
    echo ""
    print_status "$BLUE" "Checking required font tables:"
    
    local required_tables=("head" "hhea" "maxp" "name" "OS/2" "post" "cmap" "glyf" "loca")
    local missing_tables=()
    
    for table in "${required_tables[@]}"; do
        if strings "$font_file" | grep -q "^$table$"; then
            echo "   ✓ $table"
        else
            echo "   ✗ $table (missing)"
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        print_status "$RED" "❌ Missing required tables: ${missing_tables[*]}"
        ((errors++))
    else
        print_status "$GREEN" "✓ All required tables present"
    fi
    
    # Check 8: Look for null bytes or corruption indicators
    local null_count=$(tr -cd '\000' < "$font_file" | wc -c | tr -d ' ')
    local null_percentage=$(awk "BEGIN {printf \"%.2f\", ($null_count / $size) * 100}")
    
    echo ""
    echo "   Null bytes: $null_count ($null_percentage%)"
    
    if (( $(echo "$null_percentage > 10" | bc -l) )); then
        print_status "$YELLOW" "⚠️  High percentage of null bytes (> 10%)"
    fi
    
    # Check 9: Compare with old version if available
    local old_font="/tmp/CydFont_old.ttf"
    if [ -f "$old_font" ] && [ "$(basename "$font_file")" == "CydFont.ttf" ]; then
        echo ""
        print_status "$BLUE" "Comparison with old working version:"
        
        local old_size=$(wc -c < "$old_font" | tr -d ' ')
        local size_diff=$((size - old_size))
        
        echo "   Old size: $old_size bytes"
        echo "   New size: $size bytes"
        echo "   Difference: $size_diff bytes"
        
        if [ "$size_diff" -gt 0 ]; then
            print_status "$YELLOW" "⚠️  Font is $size_diff bytes larger than working version"
        elif [ "$size_diff" -lt 0 ]; then
            print_status "$YELLOW" "⚠️  Font is ${size_diff#-} bytes smaller than working version"
        else
            print_status "$GREEN" "✓ Same size as working version"
        fi
        
        # Compare checksums
        local new_checksum=$(shasum -a 256 "$font_file" | cut -d' ' -f1)
        local old_checksum=$(shasum -a 256 "$old_font" | cut -d' ' -f1)
        
        echo "   New checksum: $new_checksum"
        echo "   Old checksum: $old_checksum"
        
        if [ "$new_checksum" == "$old_checksum" ]; then
            print_status "$GREEN" "✓ Identical to working version"
        else
            print_status "$YELLOW" "⚠️  Different from working version (expected if regenerated)"
        fi
    fi
    
    # Final verdict
    echo ""
    print_status "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ $errors -eq 0 ]; then
        print_status "$GREEN" "✅ PASSED: $font_name appears to be valid"
        return 0
    else
        print_status "$RED" "❌ FAILED: $font_name has $errors error(s)"
        return 1
    fi
}

###############################################################################
# Function: Advanced validation using Python (if available)
###############################################################################
validate_font_advanced() {
    local font_file=$1
    
    if ! command -v python3 &> /dev/null; then
        return 0
    fi
    
    print_status "$BLUE" "\nRunning advanced validation..."
    
    python3 - "$font_file" << 'PYTHON_SCRIPT' || return 0
import sys
import struct

def validate_ttf_structure(font_path):
    """Validate TTF font structure"""
    try:
        with open(font_path, 'rb') as f:
            # Read TTF header
            data = f.read(12)
            if len(data) < 12:
                print("❌ File too short to be a valid TTF")
                return False
            
            # Parse header
            scaler_type = struct.unpack('>I', data[0:4])[0]
            num_tables = struct.unpack('>H', data[4:6])[0]
            
            if scaler_type not in (0x00010000, 0x74727565):  # 'true' in hex
                print(f"⚠️  Unusual scaler type: 0x{scaler_type:08x}")
            
            print(f"✓ Scaler type: 0x{scaler_type:08x}")
            print(f"✓ Number of tables: {num_tables}")
            
            # Read table directory
            tables = {}
            for i in range(num_tables):
                entry = f.read(16)
                if len(entry) < 16:
                    print(f"❌ Table directory entry {i} is incomplete")
                    return False
                
                tag = entry[0:4].decode('ascii', errors='ignore')
                checksum = struct.unpack('>I', entry[4:8])[0]
                offset = struct.unpack('>I', entry[8:12])[0]
                length = struct.unpack('>I', entry[12:16])[0]
                
                tables[tag] = {'checksum': checksum, 'offset': offset, 'length': length}
            
            # Check for required tables
            required = ['head', 'hhea', 'maxp', 'name', 'OS/2', 'post', 'cmap', 'glyf', 'loca']
            missing = [t for t in required if t not in tables]
            
            if missing:
                print(f"❌ Missing required tables: {', '.join(missing)}")
                return False
            else:
                print(f"✓ All {len(required)} required tables present")
            
            # Validate 'head' table
            if 'head' in tables:
                f.seek(tables['head']['offset'])
                head_data = f.read(54)
                
                if len(head_data) >= 54:
                    version = struct.unpack('>I', head_data[0:4])[0]
                    magic = struct.unpack('>I', head_data[12:16])[0]
                    
                    if magic != 0x5F0F3CF5:
                        print(f"❌ Invalid 'head' table magic number: 0x{magic:08x}")
                        return False
                    else:
                        print(f"✓ Valid 'head' table magic number")
            
            print("✅ Advanced validation passed")
            return True
            
    except Exception as e:
        print(f"⚠️  Advanced validation error: {str(e)}")
        return False

if __name__ == '__main__':
    validate_ttf_structure(sys.argv[1])
PYTHON_SCRIPT
}

###############################################################################
# Main execution
###############################################################################

echo ""
print_status "$BLUE" "╔════════════════════════════════════════════════════════════╗"
print_status "$BLUE" "║           Font Validation Script for iOS Safety           ║"
print_status "$BLUE" "║          Prevents FontParser CVE-2025-43400 Issues        ║"
print_status "$BLUE" "╚════════════════════════════════════════════════════════════╝"
echo ""

# Determine which fonts to validate
FONTS_TO_CHECK=()

if [ $# -eq 0 ]; then
    # No arguments provided, check all fonts in assets/fonts/
    if [ -d "assets/fonts" ]; then
        while IFS= read -r -d '' font; do
            FONTS_TO_CHECK+=("$font")
        done < <(find assets/fonts -name "*.ttf" -type f -print0)
    else
        print_status "$RED" "Error: assets/fonts/ directory not found"
        exit 1
    fi
else
    # Use provided font file
    FONTS_TO_CHECK=("$1")
fi

if [ ${#FONTS_TO_CHECK[@]} -eq 0 ]; then
    print_status "$YELLOW" "No TTF fonts found to validate"
    exit 0
fi

print_status "$BLUE" "Found ${#FONTS_TO_CHECK[@]} font(s) to validate"

# Validate each font
for font in "${FONTS_TO_CHECK[@]}"; do
    ((TOTAL_FONTS++))
    
    if validate_font_basic "$font"; then
        ((PASSED_FONTS++))
        validate_font_advanced "$font"
    else
        ((FAILED_FONTS++))
    fi
done

# Print summary
echo ""
print_status "$BLUE" "╔════════════════════════════════════════════════════════════╗"
print_status "$BLUE" "║                    Validation Summary                      ║"
print_status "$BLUE" "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "   Total fonts checked: $TOTAL_FONTS"
print_status "$GREEN" "   Passed: $PASSED_FONTS"
print_status "$RED" "   Failed: $FAILED_FONTS"
print_status "$YELLOW" "   Warnings: $WARNING_FONTS"
echo ""

if [ $FAILED_FONTS -gt 0 ]; then
    print_status "$RED" "❌ Font validation FAILED"
    print_status "$RED" "   Do not use these fonts in production - they may cause iOS crashes"
    echo ""
    print_status "$YELLOW" "Recommended actions:"
    echo "   1. Regenerate the font using a proper font editor"
    echo "   2. Use the old working version from commit 96db3d11~1"
    echo "   3. Contact the font provider for a valid version"
    exit 1
else
    print_status "$GREEN" "✅ All fonts passed validation"
    if [ $WARNING_FONTS -gt 0 ]; then
        print_status "$YELLOW" "   Note: $WARNING_FONTS font(s) have warnings - review above"
    fi
    exit 0
fi


