#!/usr/bin/env bash

readonly YABAI_BIN=/opt/homebrew/bin/yabai
readonly JQ_BIN=/usr/bin/jq
readonly NC_BIN=/usr/bin/nc

die() {
  echo "$*" >&2
  exit 1
}

notify_hammerspoon() {
  local namespace=${1:?namespace is required}
  local action=${2:?action is required}
  local value=${3:-}

  if [ -n "$value" ]; then
    /usr/bin/printf '%s %s %s' "$namespace" "$action" "$value"
  else
    /usr/bin/printf '%s %s' "$namespace" "$action"
  fi | "$NC_BIN" -u -w0 127.0.0.1 9001
}

