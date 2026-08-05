#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"

layout=$("$YABAI_BIN" -m query --spaces --space | "$JQ_BIN" -r '.type')
if [ "$layout" = "float" ]; then
  "$YABAI_BIN" -m space --layout bsp
  notify_hammerspoon yabai layout bsp
else
  "$YABAI_BIN" -m space --layout float
  notify_hammerspoon yabai layout floating
fi
