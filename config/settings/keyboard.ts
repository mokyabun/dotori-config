import type { Context } from 'dotori'

// Apple keyboard shortcut reference: https://support.apple.com/en-us/102650
// Apple UserDefaults overview: https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/AboutPreferenceDomains/AboutPreferenceDomains.html
export default (ctx: Context) => {
    ctx.macos.plist('keyboard.text', 'NSGlobalDomain', {
        mode: 'patch',
        values: {
            // Keyboard > Text Input > Input Sources > Correct spelling automatically
            NSAutomaticSpellingCorrectionEnabled: false,

            // Keyboard > Text Input > Input Sources > Capitalize words automatically
            NSAutomaticCapitalizationEnabled: false,

            // Keyboard > Text Input > Input Sources > Add period with double-space
            NSAutomaticPeriodSubstitutionEnabled: false,

            // Keyboard > Text Input > Input Sources > Use smart quotes and dashes
            NSAutomaticQuoteSubstitutionEnabled: false,

            // Keyboard > Text Input > Input Sources > Use smart quotes and dashes
            NSAutomaticDashSubstitutionEnabled: false,

            // Keyboard > Text Input > Input Sources > Show inline predictive text
            NSAutomaticInlinePredictionEnabled: false,

            // Keyboard > Text Input > Input Sources > Spelling
            KB_SpellingLanguage: {
                KB_SpellingLanguageIsAutomatic: true,
            },

            // Keyboard > Text Input > Input Sources > For double quotes
            KB_DoubleQuoteOption: '\u201cabc\u201d',

            // Keyboard > Text Input > Input Sources > For single quotes
            KB_SingleQuoteOption: '\u2018abc\u2019',
        },
    })

    ctx.macos.plist('keyboard.input-sources', 'com.apple.HIToolbox', {
        mode: 'patch',
        values: {
            // Keyboard > Text Input > Input Sources: use ABC and Korean 2-Set.
            AppleEnabledInputSources: [
                {
                    InputSourceKind: 'Keyboard Layout',
                    'KeyboardLayout ID': 252,
                    'KeyboardLayout Name': 'ABC',
                },
                {
                    'Bundle ID': 'com.apple.inputmethod.Korean',
                    'Input Mode': 'com.apple.inputmethod.Korean.2SetKorean',
                    InputSourceKind: 'Input Mode',
                },
                {
                    'Bundle ID': 'com.apple.inputmethod.Korean',
                    InputSourceKind: 'Keyboard Input Method',
                },
                {
                    'Bundle ID': 'com.apple.CharacterPaletteIM',
                    InputSourceKind: 'Non Keyboard Input Method',
                },
                {
                    'Bundle ID': 'com.apple.PressAndHold',
                    InputSourceKind: 'Non Keyboard Input Method',
                },
            ],

            // Keyboard > Text Input > current roman input source.
            AppleCurrentKeyboardLayoutInputSourceID: 'com.apple.keylayout.ABC',

            // Keyboard > Dictation
            AppleDictationAutoEnable: 0,
        },
    })

    ctx.macos.plist('keyboard.text-input-menu', 'com.apple.TextInputMenu', {
        mode: 'patch',
        values: {
            // Menu Bar > Input menu: hide the input menu in the menu bar.
            visible: false,
        },
    })

    ctx.macos.plist('keyboard.hotkeys', 'com.apple.symbolichotkeys', {
        mode: 'patch',
        values: {
            AppleSymbolicHotKeys: {
                // Keyboard Shortcuts > Input Sources > Select the previous input source
                '60': {
                    enabled: true,
                    value: {
                        parameters: [65535, 80, 0],
                        type: 'standard',
                    },
                },

                // Keyboard Shortcuts > Input Sources > Select next source in input menu
                '61': { enabled: false },

                // Keyboard Shortcuts > Spotlight > Show Spotlight search
                // Kept disabled; parameters are intentionally moved away from Cmd-Space to avoid shortcut conflicts.
                '64': {
                    enabled: false,
                    value: {
                        parameters: [59, 41, 1179648],
                        type: 'standard',
                    },
                },
            },
        },
    })
}
