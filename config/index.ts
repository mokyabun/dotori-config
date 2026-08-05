import os from 'node:os'
import { type Context, defineConfig } from 'dotori'
import desktop from './desktop'
import developer from './developer'
import game from './game'
import macmini from './macmini'
import qol from './qol'
import security from './security'
import settings from './settings/index'
import sync from './sync'

export default defineConfig((ctx: Context) => {
    const hostname = process.env.HOSTNAME || os.hostname()

    ctx.brew.install('mas')

    developer(ctx)

    ctx.group('qol', (g) => qol(g))
    ctx.group('sync', (g) => sync(g))
    ctx.group('desktop', (g) => desktop(g))
    if (hostname === 'macmini') ctx.group('macmini', (g) => macmini(g))

    ctx.group('settings', (g) => settings(g), {
        hooks: {
            afterChange: [
                ['killall', 'cfprefsd'],
                [
                    'sudo',
                    '-u',
                    // ctx.env.username is available if needed
                    ctx.env.username,
                    '/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings',
                    '-u',
                ],
            ],
        },
    })

    ctx.group('security', (g) => security(g))

    ctx.group('game', (g) => game(g))
})
