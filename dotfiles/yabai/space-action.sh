#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"

action=${1:?usage: space-action.sh focus|move prev|next}
direction=${2:?usage: space-action.sh focus|move prev|next}

case "$direction" in
  prev | next) ;;
  *) die "unknown direction: $direction" ;;
esac

current_display=$("$YABAI_BIN" -m query --spaces --space | "$JQ_BIN" -r '.display // empty')
target=$("$YABAI_BIN" -m query --spaces --space "$direction" 2>/dev/null || true)
space=$(printf '%s' "$target" | "$JQ_BIN" -r '.index // empty')
target_display=$(printf '%s' "$target" | "$JQ_BIN" -r '.display // empty')

[ -n "$space" ] && [ "$target_display" = "$current_display" ] || exit 0

case "$action" in
  focus)
    "$YABAI_BIN" -m space --focus "$space"
    ;;
  move)
    "$YABAI_BIN" -m window --space "$space"
    "$YABAI_BIN" -m space --focus "$space"
    ;;
  *)
    die "unknown action: $action"
    ;;
esac
