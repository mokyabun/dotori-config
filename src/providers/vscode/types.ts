import { z } from 'zod'
import { StepHooksSchema } from '@/types'

export type SettingsMode = 'patch' | 'replace'

export const KeybindingSchema = z.object({
    key: z.string(),
    command: z.string(),
    when: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
})

export const ProfileConfigSchema = z.object({
    location: z.string().optional(),
    settings: z
        .object({
            mode: z.enum(['patch', 'replace']),
            values: z.record(z.string(), z.unknown()),
        })
        .optional(),
    extensions: z.array(z.string()).optional(),
    keybindings: z.array(KeybindingSchema).optional(),
    tasks: z.record(z.string(), z.unknown()).optional(),
    mcp: z.record(z.string(), z.unknown()).optional(),
    languageSnippets: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    globalSnippets: z.record(z.string(), z.unknown()).optional(),
    hooks: StepHooksSchema.optional(),
})

export type Keybinding = z.infer<typeof KeybindingSchema>
export type ProfileConfig = z.infer<typeof ProfileConfigSchema>
