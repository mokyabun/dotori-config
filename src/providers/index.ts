import type { ProviderScope } from '../types'
import { BrewProvider } from './brew'
import { FileProvider } from './file'
import { LaunchdProvider } from './launchd'
import { MacosProvider } from './macos'
import { VscodeProvider } from './vscode'

export interface DotoriProviders {
    brew: BrewProvider
    file: FileProvider
    vscode: VscodeProvider
    macos: MacosProvider
    launchd: LaunchdProvider
}

export function createDefaultProviders(scope: ProviderScope): DotoriProviders {
    return {
        brew: new BrewProvider(scope),
        file: new FileProvider(scope),
        vscode: new VscodeProvider(scope),
        macos: new MacosProvider(scope),
        launchd: new LaunchdProvider(scope),
    }
}

export { BrewProvider } from './brew'
export { FileProvider } from './file'
export { LaunchdProvider } from './launchd'
export { MacosProvider } from './macos'
export { VscodeProvider } from './vscode'
