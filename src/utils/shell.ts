/**
 * Run a shell command and return its output.
 * Throws if exit code is non-zero.
 */
export async function run(cmd: string[], env?: Record<string, string>): Promise<string> {
    const proc = Bun.spawnSync(cmd, {
        env: env ? { ...process.env, ...env } : undefined,
    })
    if (proc.exitCode !== 0) {
        throw new Error(`Command failed: ${cmd.join(' ')}\n${proc.stderr.toString()}`)
    }
    return proc.stdout.toString().trim()
}

/**
 * Run a command and return { stdout, exitCode }. Does not throw.
 */
export function runSafe(
    cmd: string[],
    env?: Record<string, string>,
): { stdout: string; stderr: string; exitCode: number } {
    const proc = Bun.spawnSync(cmd, {
        env: env ? { ...process.env, ...env } : undefined,
    })
    return {
        stdout: proc.stdout.toString().trim(),
        stderr: proc.stderr.toString().trim(),
        exitCode: proc.exitCode ?? 1,
    }
}
