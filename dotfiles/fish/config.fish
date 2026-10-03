set -g fish_greeting
set -g fish_autosuggestion_enabled 1
set -g fish_color_normal f8f8f2
set -g fish_color_autosuggestion 6272a4
set -g fish_color_comment 6272a4
set -g fish_color_command 8be9fd
set -g fish_color_param ffb86c
set -g fish_color_error ff5555
set -g fish_color_quote f1fa8c
set -g fish_color_redirection ff79c6
set -g fish_color_operator ff79c6
set -g fish_color_end bd93f9

set -gx FZF_DEFAULT_OPTS '--height=40% --layout=reverse --border=rounded --info=inline --prompt="> " --pointer=">" --marker="+" --color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9,fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9,info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6,marker:#ff5555,spinner:#ffb86c,header:#6272a4,border:#6272a4'

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
