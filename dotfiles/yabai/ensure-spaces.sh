#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"
readonly SPACES_PER_DISPLAY=6

# display_added fires once per display on wake; concurrent runs would both top up the same display.
if [ -z "${ENSURE_SPACES_LOCKED:-}" ]; then
  ENSURE_SPACES_LOCKED=1 exec /usr/bin/lockf -t 30 "/tmp/yabai_$(/usr/bin/id -un).ensure-spaces.lock" "$0" "$@"
fi

for display in $("$YABAI_BIN" -m query --displays | "$JQ_BIN" -r '.[].index'); do
  count=$("$YABAI_BIN" -m query --displays --display "$display" | "$JQ_BIN" '.spaces | length')

  while [ "$count" -lt "$SPACES_PER_DISPLAY" ]; do
    "$YABAI_BIN" -m space --create "$display"
    count=$((count + 1))
  done
done
