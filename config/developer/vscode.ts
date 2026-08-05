import type { Context } from 'dotori'

const BASE_EXTENSIONS = [
    'dracula-theme.theme-dracula',
    'thang-nm.catppuccin-perfect-icons',
    'EditorConfig.EditorConfig',
]

const VSCODE_FILE_NESTING_CAPTURE = ['$', '{capture}'].join('')

export const BASE_SETTINGS = {
    'editor.fontSize': 12,
    'editor.tabSize': 4,

    'editor.formatOnSave': true,
    'editor.minimap.enabled': false,
    'editor.bracketPairColorization.enabled': true,
    'editor.guides.bracketPairs': 'active',

    'editor.stickyScroll.enabled': true,
    'editor.cursorBlinking': 'smooth',

    'editor.linkedEditing': true,
    'editor.renderWhitespace': 'boundary',

    'editor.inlayHints.enabled': 'onUnlessPressed',
    'editor.suggestSelection': 'first',
    'editor.snippetSuggestions': 'top',
    'editor.wordBasedSuggestions': 'off',
    'editor.acceptSuggestionOnEnter': 'smart',

    'files.trimTrailingWhitespace': true,
    'files.insertFinalNewline': true,

    'terminal.integrated.fontFamily': 'JetBrainsMono Nerd Font',
    'terminal.integrated.mouseWheelScrollSensitivity': 3,
    'terminal.integrated.defaultProfile.osx': 'fish',
    'terminal.integrated.profiles.osx': {
        fish: {
            path: 'fish',
            args: ['-l'],
        },
    },

    'workbench.startupEditor': 'none',
    'workbench.editor.enablePreview': false,
    'workbench.tree.indent': 16,

    'explorer.confirmDelete': false,
    'explorer.confirmDragAndDrop': false,

    'explorer.fileNesting.enabled': true,
    'explorer.fileNesting.patterns': {
        'package.json': '*',
        '*.ts': `${VSCODE_FILE_NESTING_CAPTURE}.test.ts, ${VSCODE_FILE_NESTING_CAPTURE}.spec.ts`,
        '*.js': `${VSCODE_FILE_NESTING_CAPTURE}.test.js, ${VSCODE_FILE_NESTING_CAPTURE}.spec.js`,
    },

    'git.autofetch': true,
    'git.confirmSync': false,

    'search.exclude': {
        '**/node_modules': true,
        '**/dist': true,
        '**/.git': true,
    },

    'workbench.colorTheme': 'Dracula Theme',
    'workbench.iconTheme': 'Catppuccin Perfect Latte',

    'workbench.welcomePage.walkthroughs.openOnInstall': false,
}

export default (ctx: Context) => {
    ctx.brew.cask('visual-studio-code')

    ctx.vscode.settings('default', 'patch', {
        ...BASE_SETTINGS,
        '[lua]': {
            'editor.defaultFormatter': 'JohnnyMorganz.stylua',
        },
        '[json, jsonc]': {
            'editor.tabSize': 2,
        },
        '[yaml]': {
            'editor.tabSize': 2,
        },
    })
    ctx.vscode.extensions('default', BASE_EXTENSIONS)
    ctx.vscode.keybindings('default', [
        {
            key: 'shift+enter',
            command: 'workbench.action.terminal.sendSequence',
            args: { text: '\u001b\r' },
            when: 'terminalFocus',
        },
    ])

    ctx.vscode.profile('node')
    ctx.vscode.settings('node', 'patch', {
        ...BASE_SETTINGS,
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        '[typescript, javascript, typescriptreact, javascriptreact, json, jsonc]': {
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
        },
        'typescript.experimental.useTsgo': true,
        'svelte.enable-ts-plugin': true,
    })
    ctx.vscode.extensions('node', [
        ...BASE_EXTENSIONS,
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint',
        'ms-vscode.vscode-typescript-next',
        'TypeScriptTeam.native-preview',
        'svelte.svelte-vscode',
    ])

    ctx.vscode.profile('node-modern')
    ctx.vscode.settings('node-modern', 'patch', {
        ...BASE_SETTINGS,
        'editor.defaultFormatter': 'biomejs.biome',
        '[typescript, javascript, typescriptreact, javascriptreact, json, jsonc]': {
            'editor.defaultFormatter': 'biomejs.biome',
        },
        'editor.codeActionsOnSave': {
            'source.organizeImports.biome': 'explicit',
            'source.fixAll.biome': 'explicit',
        },
        'json.schemaDownload.trustedDomains': {
            'https://schemastore.azurewebsites.net/': true,
            'https://raw.githubusercontent.com/microsoft/vscode/': true,
            'https://raw.githubusercontent.com/devcontainers/spec/': true,
            'https://www.schemastore.org/': true,
            'https://json.schemastore.org/': true,
            'https://json-schema.org/': true,
            'https://developer.microsoft.com/json-schemas/': true,
            'https://biomejs.dev': true,
        },
        'typescript.experimental.useTsgo': true,
        '[typescriptreact]': {
            'editor.defaultFormatter': 'biomejs.biome',
        },
        'biome.configurationPath': '',
        'svelte.enable-ts-plugin': true,
        'extensions.ignoreRecommendations': true,
    })
    ctx.vscode.extensions('node-modern', [
        ...BASE_EXTENSIONS,
        'biomejs.biome',
        'bradlc.vscode-tailwindcss',
        'ritwickdey.liveserver',
        'TypeScriptTeam.native-preview',
        'svelte.svelte-vscode',
    ])

    ctx.vscode.profile('python')
    ctx.vscode.settings('python', 'patch', {
        ...BASE_SETTINGS,
        'editor.defaultFormatter': 'ms-python.black-formatter',
        '[python]': {
            'editor.defaultFormatter': 'ms-python.black-formatter',
        },
    })
    ctx.vscode.extensions('python', [
        ...BASE_EXTENSIONS,
        'ms-python.python',
        'ms-python.debugpy',
        'ms-python.vscode-python-envs',
        'ms-python.vscode-pylance',
        'ms-python.black-formatter',
        'ms-toolsai.jupyter',
        'ms-toolsai.jupyter-keymap',
        'ms-toolsai.jupyter-renderers',
        'ms-toolsai.vscode-jupyter-cell-tags',
        'ms-toolsai.vscode-jupyter-slideshow',
    ])
}
