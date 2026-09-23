import type { Context } from '@mokyabun/dotori'
import agent from './agent'
import environment from './environment'
import shell from './shell'
import terminal from './terminal'
import zed from './zed'

export default (ctx: Context) => {
    ctx.group('developer/agent', (g) => agent(g))
    ctx.group('developer/environment', (g) => environment(g))
    ctx.group('developer/shell', (g) => shell(g))
    ctx.group('developer/terminal', (g) => terminal(g))
}
