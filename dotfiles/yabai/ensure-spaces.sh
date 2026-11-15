#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"
readonly MAIN_DISPLAY_SPACES=6
readonly SECONDARY_DISPLAY_SPACES=3

# display_added fires once per display on wake; concurrent runs would both top up the same display.
if [ -z "${ENSURE_SPACES_LOCKED:-}" ]; then
  ENSURE_SPACES_LOCKED=1 exec /usr/bin/lockf -t 30 "/tmp/yabai_$(/usr/bin/id -un).ensure-spaces.lock" "$0" "$@"
fi

# macOS places the main display's frame at the global origin.
"$YABAI_BIN" -m query --displays |
  "$JQ_BIN" -r --argjson main "$MAIN_DISPLAY_SPACES" --argjson secondary "$SECONDARY_DISPLAY_SPACES" \
    '.[] | "\(.index) \(.spaces | length) \(if .frame.x == 0 and .frame.y == 0 then $main else $secondary end)"' |
  while read -r display count target; do
    while [ "$count" -lt "$target" ]; do
      "$YABAI_BIN" -m space --create "$display"
      count=$((count + 1))
    done
  done
