#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"
readonly LSAPPINFO=/usr/bin/lsappinfo

# Some games become the macOS frontmost application without publishing a
# reliable AX focused-window event. Resolve their window from the frontmost
# process instead of relying solely on yabai's cached focused window.
front_app=$($LSAPPINFO front)
front_pid=$($LSAPPINFO info -only pid "$front_app" | tr -cd '0-9')

[ -n "$front_pid" ] || {
  echo "could not determine the frontmost application PID" >&2
  exit 1
}

window=$(
  "$YABAI_BIN" -m query --windows |
    "$JQ_BIN" -r --argjson pid "$front_pid" '
      [
        .[]
        | select(
            .pid == $pid
            and .["has-ax-reference"]
            and .["can-move"]
            and .["can-resize"]
          )
      ]
      | sort_by(
          if .["has-focus"] then 0
          elif .["is-visible"] then 1
          else 2
          end
        )
      | .[0].id // empty
    '
)

[ -n "$window" ] || {
  echo "frontmost application has no manageable window" >&2
  exit 1
}

"$YABAI_BIN" -m window "$window" --toggle float

layout=$(
  "$YABAI_BIN" -m query --windows --window "$window" |
    "$JQ_BIN" -r 'if .["is-floating"] then "floating" else "bsp" end'
)
notify_hammerspoon yabai window-layout "$layout"
