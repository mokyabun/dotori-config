set -g fish_greeting
set -g fish_autosuggestion_enabled 1
set -g fish_color_autosuggestion 9ca0b0
set -g fish_color_command 1e66f5
set -g fish_color_param 4c4f69
set -g fish_color_error d20f39
set -g fish_color_quote 40a02b
set -g fish_color_redirection ea76cb
set -g fish_color_operator df8e1d

set -gx FZF_DEFAULT_OPTS '--height=40% --layout=reverse --border=rounded --info=inline --prompt="> " --pointer=">" --marker="+" --color=fg:#4c4f69,bg:#eff1f5,hl:#d20f39,fg+:#4c4f69,bg+:#ccd0da,hl+:#d20f39,info:#8839ef,prompt:#1e66f5,pointer:#df8e1d,marker:#40a02b,spinner:#179299,header:#8c8fa1,border:#acb0be'

alias grep='rg'
alias l='eza -lha --icons --git --group-directories-first'
alias la='eza -la --icons --git --group-directories-first'
alias lt='eza --tree --level=2 --icons --git --group-directories-first'
alias dir-size='du -sh'
alias biggest='du -ah . 2>/dev/null | sort -rh | head -50'
alias recent='eza -la --icons --git --sort=modified --reverse'
alias ports='lsof -nP -iTCP -sTCP:LISTEN'
alias path-lines='printf "%s\n" $PATH'
alias mkdirp='mkdir -p'
alias serve='python3 -m http.server'
alias rls='rsync -navi --delete'

function dir-sizes
    find . -maxdepth 1 -mindepth 1 -exec du -sh {} + 2>/dev/null | sort -h
end

function rcp
    rsync -ah --info=progress2 $argv
end

function rmirror
    rsync -ah --delete --info=progress2 $argv
end

function rdry
    rsync -ahnvi --delete $argv
end

if type -q fzf
    fzf --fish | source
end

if type -q starship
    starship init fish | source
end
