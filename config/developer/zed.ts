import type { Context } from 'dotori'

const AUTO_INSTALL_EXTENSIONS = {
    catppuccin: true,
    'catppuccin-icons': true,
    biome: true,
    svelte: true,
    lua: true,
}

const PRETTIER_FORMATTER = {
    external: {
        command: 'prettier',
        arguments: ['--stdin-filepath', '{buffer_path}'],
    },
}

const BLACK_FORMATTER = {
    external: {
        command: 'black',
        arguments: ['--stdin-filename', '{buffer_path}', '-'],
    },
}

const NODE_LANGUAGES = ['JavaScript', 'TypeScript', 'JSX', 'TSX', 'JSON', 'JSONC', 'CSS', 'Svelte']
const BIOME_LANGUAGES = [...NODE_LANGUAGES, 'Vue.js', 'Astro']

function languageSettings(languages: string[], values: Record<string, unknown>) {
    return Object.fromEntries(languages.map((language) => [language, values]))
}

const PROFILES = {
    node: {
        settings: {
            inlay_hints: {
                show_type_hints: false,
            },
            languages: languageSettings(NODE_LANGUAGES, {
                formatter: PRETTIER_FORMATTER,
                format_on_save: 'on',
            }),
        },
    },
    'node-modern': {
        settings: {
            inlay_hints: {
                show_type_hints: false,
            },
            languages: languageSettings(BIOME_LANGUAGES, {
                code_actions_on_format: {
                    'source.fixAll.biome': true,
                    'source.organizeImports.biome': true,
                },
                format_on_save: 'on',
            }),
        },
    },
    python: {
        settings: {
            languages: {
                Python: {
                    formatter: BLACK_FORMATTER,
                    code_actions_on_format: {
                        'source.organizeImports.ruff': false,
                    },
                    format_on_save: 'on',
                },
            },
        },
    },
}

const BASE_SETTINGS = {
    base_keymap: 'VSCode',
    buffer_font_family: 'JetBrainsMono Nerd Font',
    buffer_font_size: 12,
    buffer_line_height: 'comfortable',

    format_on_save: 'on',
    tab_size: 4,
    hard_tabs: false,
    ensure_final_newline_on_save: true,
    remove_trailing_whitespace_on_save: true,

    autosave: 'off',
    auto_signature_help: true,
    inlay_hints: {
        enabled: true,
    },
    show_whitespaces: 'boundary',
    soft_wrap: 'editor_width',
    current_line_highlight: 'all',
    scrollbar: {
        show: 'never',
    },

    theme: 'Catppuccin Latte',
    icon_theme: 'Catppuccin Latte',
    ui_font_size: 16,

    tabs: {
        file_icons: true,
    },

    project_panel: {
        dock: 'left',
    },

    agent: {
        dock: 'right',
    },

    file_scan_exclusions: [
        '**/.git',
        '**/.svn',
        '**/.hg',
        '**/.jj',
        '**/CVS',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/.classpath',
        '**/.settings',
        '**/node_modules',
        '**/dist',
    ],
    auto_install_extensions: AUTO_INSTALL_EXTENSIONS,

    terminal: {
        font_family: 'JetBrainsMono Nerd Font',
        font_size: 12,
        line_height: 'standard',
        option_as_meta: true,
        working_directory: 'current_project_directory',
    },

    profiles: PROFILES,

    lsp: {
        biome: {
            binary: {
                path: '/opt/homebrew/bin/biome',
                arguments: ['lsp-proxy'],
            },
            settings: {
                require_config_file: true,
            },
        },
    },
}

export default (ctx: Context) => {
    ctx.brew.cask('zed')

    ctx.file.json('~/.config/zed/settings.json', {
        mode: 'patch',
        values: BASE_SETTINGS,
    })
}
