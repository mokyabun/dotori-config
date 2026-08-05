#!/usr/bin/env bash

set -euo pipefail

readonly CONFIG_DIR=${XDG_CONFIG_HOME:-"$HOME/.config"}/yabai
# shellcheck source=/dev/null
. "$CONFIG_DIR/lib.sh"

action=${1:?usage: notify.sh ACTION [VALUE]}
notify_hammerspoon yabai "$action" "${2:-}"

