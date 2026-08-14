#!/bin/sh

set -eu

readonly installer_version='v1.4.0'
readonly discord_app='/Applications/Discord.app'
readonly discord_resources="$discord_app/Contents/Resources"
readonly vencord_patcher="$HOME/Library/Application Support/Vencord/dist/patcher.js"

if [ -e "$discord_resources/_app.asar" ] && [ -f "$vencord_patcher" ]; then
    exit 0
fi

if [ ! -d "$discord_app" ]; then
    echo "Discord was not found at $discord_app" >&2
    exit 1
fi

if pgrep -x Discord >/dev/null; then
    osascript -e 'tell application "Discord" to quit'

    attempts=0
    while pgrep -x Discord >/dev/null; do
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 30 ]; then
            echo 'Discord did not quit; close it and apply the discord group again.' >&2
            exit 1
        fi
        sleep 1
    done
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

git clone --branch "$installer_version" --depth 1 https://github.com/Vencord/Installer.git "$work_dir/installer"

(
    cd "$work_dir/installer"
    CGO_ENABLED=0 go build -tags 'static cli' -ldflags '-s -w' -o "$work_dir/vencord-installer"
)

"$work_dir/vencord-installer" --install --branch stable
