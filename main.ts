import path from 'node:path'
import { createDotori, runCli } from '@mokyabun/dotori'
import config from './config'

const dotori = await createDotori({
    config,
    configCwd: path.join(import.meta.dir, 'config'),
})

await runCli(dotori)
