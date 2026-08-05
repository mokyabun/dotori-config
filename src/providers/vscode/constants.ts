import os from 'node:os'
import path from 'node:path'

export const VSCODE_USER_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User')
export const STORAGE_PATH = path.join(VSCODE_USER_DIR, 'globalStorage', 'storage.json')
export const VSCODE_BUILTIN_EXTENSIONS_DIR = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions'
