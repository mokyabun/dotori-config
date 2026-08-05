#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"

delta=${1:?usage: resize-smart.sh DELTA}
digits=${delta#-}
case "$digits" in
  '' | *[!0-9]*) die "delta must be an integer: $delta" ;;
esac

if [ "$delta" -lt 0 ]; then
  amount=$((-delta))
  "$YABAI_BIN" -m window --resize "right:-${amount}:0" ||
    "$YABAI_BIN" -m window --resize "left:${amount}:0" ||
    "$YABAI_BIN" -m window --resize "bottom:0:-${amount}" ||
    "$YABAI_BIN" -m window --resize "top:0:${amount}"
else
  "$YABAI_BIN" -m window --resize "right:${delta}:0" ||
    "$YABAI_BIN" -m window --resize "left:-${delta}:0" ||
    "$YABAI_BIN" -m window --resize "bottom:0:${delta}" ||
    "$YABAI_BIN" -m window --resize "top:0:-${delta}"
fi
