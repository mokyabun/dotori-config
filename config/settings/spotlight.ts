import type { Context } from 'dotori'

const disabledSpotlightCategories = [
    'SOURCE',
    'MENU_EXPRESSION',
    'MENU_OTHER',
    'MOVIES',
    'DOCUMENTS',
    'MENU_CONVERSION',
    'FONTS',
    'SPREADSHEETS',
    'SYSTEM_PREFS',
    'CONTACT',
    'BOOKMARKS',
    'MUSIC',
    'APPLICATIONS',
    'IMAGES',
    'EVENT_TODO',
    'MENU_DEFINITION',
    'TIPS',
    'DIRECTORIES',
    'PRESENTATIONS',
    'MESSAGES',
    'PDF',
    'MENU_SPOTLIGHT_SUGGESTIONS',
]

export default (ctx: Context) => {
    ctx.macos.plist('spotlight', 'com.apple.Spotlight', {
        mode: 'patch',
        values: {
            // Siri & Spotlight > Search Results: keep every indexed result category disabled.
            orderedItems: disabledSpotlightCategories.map((name) => ({ enabled: false, name })),
        },
    })
}
