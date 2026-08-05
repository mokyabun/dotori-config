#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"
readonly SPACES_PER_DISPLAY=3

for display in $("$YABAI_BIN" -m query --displays | "$JQ_BIN" -r '.[].index'); do
  count=$("$YABAI_BIN" -m query --displays --display "$display" | "$JQ_BIN" '.spaces | length')

  while [ "$count" -lt "$SPACES_PER_DISPLAY" ]; do
    "$YABAI_BIN" -m space --create "$display"
    count=$((count + 1))
  done
done
