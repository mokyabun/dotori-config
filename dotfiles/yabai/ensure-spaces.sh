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

# A disconnected display's spaces move to the main display and are not always given back,
# so trim empty surplus spaces as well as filling missing ones.
plan=$(
  "$JQ_BIN" -rn \
    --argjson displays "$("$YABAI_BIN" -m query --displays)" \
    --argjson spaces "$("$YABAI_BIN" -m query --spaces)" \
    --argjson main "$MAIN_DISPLAY_SPACES" \
    --argjson secondary "$SECONDARY_DISPLAY_SPACES" '
    [
      $displays[] as $display
      # macOS places the main display at the global origin.
      | (if $display.frame.x == 0 and $display.frame.y == 0 then $main else $secondary end) as $target
      | [$spaces[] | select(.display == $display.index and (.["is-native-fullscreen"] | not))] as $own
      | {
          display: $display.index,
          missing: ([0, $target - ($own | length)] | max),
          surplus: [
            $own
            | map(select((.windows | length) == 0 and (.["is-visible"] | not)) | .index)
            | reverse
            | .[:([0, ($own | length) - $target] | max)][]
          ]
        }
    ] as $plan
    # Destroy from the highest index down so earlier indexes stay valid.
    | ([$plan[].surplus[]] | sort | reverse | .[] | "destroy \(.)"),
      ($plan[] | select(.missing > 0) | "create \(.display) \(.missing)")
  '
)

while read -r action target count; do
  case "$action" in
    destroy)
      "$YABAI_BIN" -m space "$target" --destroy
      ;;
    create)
      for _ in $(seq "$count"); do
        "$YABAI_BIN" -m space --create "$target"
      done
      ;;
  esac
done <<<"$plan"
