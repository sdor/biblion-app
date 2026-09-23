#!/usr/bin/env bash

set -e

# Biblion Office Add-in Local Sideload Script for macOS

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_SRC="${MANIFEST_PATH:-${3:-$APP_DIR/manifest.prod.xml}}"

if [ ! -f "$MANIFEST_SRC" ]; then
  if [ -f "$APP_DIR/manifest.xml" ]; then
    MANIFEST_SRC="$APP_DIR/manifest.xml"
  else
    echo "Error: Manifest not found ($MANIFEST_SRC)"
    exit 1
  fi
fi

WORD_WEF="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"
EXCEL_WEF="$HOME/Library/Containers/com.microsoft.Excel/Data/Documents/wef"
PPT_WEF="$HOME/Library/Containers/com.microsoft.PowerPoint/Data/Documents/wef"

ACTION="${1:-install}"
TARGET_APP="${2:-word}"

install_manifest() {
  local target_dir="$1"
  local app_name="$2"
  
  local container_parent
  container_parent="$(dirname "$target_dir")"
  if [ -d "$container_parent" ]; then
    mkdir -p "$target_dir"
    cp "$MANIFEST_SRC" "$target_dir/manifest.xml"
    echo "✓ Sideloaded $(basename "$MANIFEST_SRC") into $app_name WEF folder as manifest.xml: $target_dir"
  else
    echo "⚠ $app_name container directory not found ($container_parent). Is $app_name installed?"
  fi
}

remove_manifest() {
  local target_dir="$1"
  local app_name="$2"
  
  if [ -f "$target_dir/manifest.xml" ]; then
    rm -f "$target_dir/manifest.xml"
    echo "✓ Removed manifest.xml from $app_name WEF folder"
  fi
}

case "$ACTION" in
  install|sideload)
    echo "=== Sideloading Biblion Add-in to Office for Mac ==="
    case "$TARGET_APP" in
      word)
        install_manifest "$WORD_WEF" "Word"
        ;;
      excel)
        install_manifest "$EXCEL_WEF" "Excel"
        ;;
      ppt|powerpoint)
        install_manifest "$PPT_WEF" "PowerPoint"
        ;;
      all)
        install_manifest "$WORD_WEF" "Word"
        install_manifest "$EXCEL_WEF" "Excel"
        install_manifest "$PPT_WEF" "PowerPoint"
        ;;
      *)
        echo "Unknown target app: $TARGET_APP (expected: word, excel, ppt, or all)"
        exit 1
        ;;
    esac
    echo ""
    echo "Next steps:"
    echo "1. Start the dev server with HTTPS enabled: npm run start:ssl"
    echo "2. Open Word or Excel, navigate to Insert > My Add-ins (or check the Ribbon tab for 'Biblion')"
    ;;

  remove|clean|unsideload)
    echo "=== Removing Biblion Add-in from Office for Mac ==="
    case "$TARGET_APP" in
      word)
        remove_manifest "$WORD_WEF" "Word"
        ;;
      excel)
        remove_manifest "$EXCEL_WEF" "Excel"
        ;;
      ppt|powerpoint)
        remove_manifest "$PPT_WEF" "PowerPoint"
        ;;
      all)
        remove_manifest "$WORD_WEF" "Word"
        remove_manifest "$EXCEL_WEF" "Excel"
        remove_manifest "$PPT_WEF" "PowerPoint"
        ;;
    esac
    echo "✓ Cleaned up sideloaded manifest."
    ;;

  *)
    echo "Usage: $0 [install|remove] [word|excel|ppt|all]"
    exit 1
    ;;
esac
