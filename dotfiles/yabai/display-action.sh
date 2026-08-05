#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"

action=${1:?usage: display-action.sh focus|move north|south|next [wrap]}
direction=${2:?usage: display-action.sh focus|move north|south|next [wrap]}
wrap=${3:-}

case "$action" in
  focus | move) ;;
  *) die "unknown action: $action" ;;
esac

case "$direction" in
  north | south | east | west | prev | next) ;;
  *) die "unknown direction: $direction" ;;
esac

target=$("$YABAI_BIN" -m query --displays --display "$direction" 2>/dev/null | "$JQ_BIN" -r '.index // empty')

if [ -z "$target" ] && [ "$wrap" = "wrap" ]; then
  case "$direction" in
    next) target=$("$YABAI_BIN" -m query --displays | "$JQ_BIN" -r 'first.index') ;;
    prev) target=$("$YABAI_BIN" -m query --displays | "$JQ_BIN" -r 'last.index') ;;
  esac
fi

[ -n "$target" ] || exit 0

space=$(
  "$YABAI_BIN" -m query --spaces |
    "$JQ_BIN" -r --argjson display "$target" \
      '[.[] | select(.display == $display and .["is-visible"])][0].index // empty'
)

[ -n "$space" ] || exit 0

case "$action" in
  focus)
    "$YABAI_BIN" -m space --focus "$space"
    ;;
  move)
    "$YABAI_BIN" -m window --space "$space"
    "$YABAI_BIN" -m space --focus "$space"
    ;;
esac
