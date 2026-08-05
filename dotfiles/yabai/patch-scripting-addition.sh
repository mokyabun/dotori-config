#!/usr/bin/env bash

set -euo pipefail

LOADER=/Library/ScriptingAdditions/yabai.osax/Contents/MacOS/loader

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

if [ ! -f "$LOADER" ]; then
  echo "yabai scripting-addition loader not found: $LOADER" >&2
  exit 1
fi

read -r architecture offset < <(
  otool -f "$LOADER" |
    awk '/architecture/{architecture=$2} /capabilities 0x81/{target=1} target&&/offset/{print architecture, $2; exit}'
)

if [ -z "${offset:-}" ]; then
  echo "yabai loader is already compatible; no patch needed."
  exit 0
fi

# Match the arm64e PAC ABI capability used by Dock.app on macOS 15.7.x.
printf '\x80' |
  dd of="$LOADER" bs=1 seek=$((8 + architecture * 20 + 4)) count=1 conv=notrunc status=none
printf '\x80' |
  dd of="$LOADER" bs=1 seek=$((offset + 11)) count=1 conv=notrunc status=none

codesign --force --sign - "$LOADER"
echo "Patched and re-signed the yabai scripting-addition loader."
