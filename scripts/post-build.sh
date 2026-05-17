#!/usr/bin/env bash

# ANSI escape codes for colored console outputs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine script and workspace root directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUNDLE_DIR="$ROOT_DIR/src-tauri/target/release/bundle"
TARGET_BUILD_DIR="$ROOT_DIR/build"

echo -e "${CYAN}📦 Gathering compiled Linux packages...${NC}"

# Ensure root-level 'build' directory exists
if [ ! -d "$TARGET_BUILD_DIR" ]; then
    mkdir -p "$TARGET_BUILD_DIR"
    echo -e "📁 Created root-level build directory at: $TARGET_BUILD_DIR"
fi

copied_count=0

# Formats to look for
formats=("deb" "rpm" "appimage")

for format in "${formats[@]}"; do
    format_path="$BUNDLE_DIR/$format"
    
    if [ -d "$format_path" ]; then
        # Enable nullglob to avoid literal glob names when no matches are found
        shopt -s nullglob
        
        # Find files matching deb, rpm, and AppImage formats
        for source_file in "$format_path"/*.deb "$format_path"/*.rpm "$format_path"/*.AppImage; do
            filename=$(basename "$source_file")
            echo -e "🚚 ${GREEN}Copying $filename -> build/$filename${NC}"
            cp "$source_file" "$TARGET_BUILD_DIR/"
            copied_count=$((copied_count + 1))
        done
        
        shopt -u nullglob
    else
        echo -e "${YELLOW}⚠️  Bundle directory for \"$format\" not found at: $format_path${NC}"
    fi
done

if [ "$copied_count" -gt 0 ]; then
    echo -e "${GREEN}✨ Build packaging collection complete! Moved $copied_count file(s) into root \"build/\" folder.${NC}"
else
    echo -e "${RED}❌ No packaged files were found. Make sure you run a production Tauri build first.${NC}"
fi
