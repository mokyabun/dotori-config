import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function atomicWriteFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    const tmp = path.join(os.tmpdir(), `dotori-${process.pid}-${Date.now()}`)
    fs.writeFileSync(tmp, content, 'utf8')
    fs.renameSync(tmp, filePath)
}

export function atomicWriteJson(filePath: string, data: unknown): void {
    atomicWriteFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}
