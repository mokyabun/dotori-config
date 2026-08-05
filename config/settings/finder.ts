import type { Context } from 'dotori'

const finderListColumns = [
    { identifier: 'name', visible: true, ascending: true, width: 300 },
    { identifier: 'dateModified', visible: true, ascending: false, width: 181 },
    { identifier: 'dateCreated', visible: false, ascending: false, width: 181 },
    { identifier: 'size', visible: true, ascending: false, width: 97 },
    { identifier: 'kind', visible: true, ascending: true, width: 115 },
    { identifier: 'label', visible: false, ascending: true, width: 100 },
    { identifier: 'version', visible: false, ascending: true, width: 75 },
    { identifier: 'comments', visible: false, ascending: true, width: 300 },
    { identifier: 'dateLastOpened', visible: false, ascending: false, width: 200 },
    { identifier: 'shareOwner', visible: false, ascending: false, width: 200 },
    { identifier: 'shareLastEditor', visible: false, ascending: false, width: 200 },
]

const finderListViewSettings = {
    calculateAllSizes: false,
    columns: finderListColumns,
    iconSize: 16,
    showIconPreview: true,
    sortColumn: 'dateModified',
    textSize: 13,
    useRelativeDates: true,
    viewOptionsVersion: 0,
}

const finderLegacyListViewSettings = {
    ...finderListViewSettings,
    columns: Object.fromEntries(
        finderListColumns
            .filter((column) => column.identifier !== 'shareOwner' && column.identifier !== 'shareLastEditor')
            .map(({ identifier, ...column }, index) => [identifier, { ...column, index }]),
    ),
}

const finderIconViewSettings = {
    arrangeBy: 'none',
    backgroundColorBlue: 1,
    backgroundColorGreen: 1,
    backgroundColorRed: 1,
    backgroundType: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridSpacing: 54,
    iconSize: 64,
    labelOnBottom: true,
    showIconPreview: true,
    showItemInfo: false,
    textSize: 12,
    viewOptionsVersion: 0,
}

const finderGalleryViewSettings = {
    arrangeBy: 'name',
    iconSize: 48,
    showIconPreview: true,
    viewOptionsVersion: 0,
}

export default (ctx: Context) => {
    ctx.macos.plist('finder', 'com.apple.finder', {
        mode: 'patch',
        values: {
            // Keep the Finder Desktop window active; yabai needs it to focus empty Spaces reliably.
            CreateDesktop: true,

            // Finder > Settings > Advanced > Show all filename extensions is complemented by hidden file visibility.
            AppleShowAllFiles: true,

            // Finder > Settings > Advanced > When performing a search > Search the Current Folder
            FXDefaultSearchScope: 'SCcf',

            // Finder > Settings > Advanced > Show warning before changing an extension
            FXEnableExtensionChangeWarning: false,

            // Finder > View > as List
            FXPreferredViewStyle: 'Nlsv',

            // Finder > New Finder windows show > Home
            NewWindowTarget: 'PfHm',

            // Finder > View > Show Path Bar
            ShowPathbar: true,

            // Finder > Settings > Sidebar > Recent Tags
            ShowRecentTags: false,

            // Finder > View > Show Status Bar
            ShowStatusBar: true,

            // Finder > Settings > General > Show these items on the desktop > Hard disks
            ShowHardDrivesOnDesktop: false,

            // Finder > Settings > General > Show these items on the desktop > External disks
            ShowExternalHardDrivesOnDesktop: false,

            // Finder > Settings > General > Show these items on the desktop > CDs, DVDs, and iPods
            ShowRemovableMediaOnDesktop: true,

            // Finder > Settings > General > Show these items on the desktop > Connected servers
            ShowMountedServersOnDesktop: false,

            // Finder list view defaults: visible columns, icon size, sort column, and relative dates.
            FK_DefaultListViewSettings: finderListViewSettings,

            // Finder standard view defaults used by newer Finder windows.
            FK_StandardViewSettings: {
                ExtendedListViewSettingsV2: finderListViewSettings,
                IconViewSettings: finderIconViewSettings,
                ListViewSettings: finderLegacyListViewSettings,
                SettingsType: 'FK_StandardViewSettings',
            },

            // Finder standard view defaults used by legacy Finder windows.
            StandardViewSettings: {
                ExtendedListViewSettingsV2: finderListViewSettings,
                GalleryViewSettings: finderGalleryViewSettings,
                IconViewSettings: finderIconViewSettings,
                ListViewSettings: finderLegacyListViewSettings,
                SettingsType: 'StandardViewSettings',
            },
        },
        afterChange: [['killall', 'Finder']],
    })
}
