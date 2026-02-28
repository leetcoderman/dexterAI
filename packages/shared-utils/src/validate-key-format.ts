// Ensure longer, more specific prefixes (like sk-ant-) are listed BEFORE shorter prefixes (like sk-)
export const KEY_PREFIX_MAP: [string, string][] = [
    ['nvapi-', 'nvidia_nim'],
    ['sk-ant-', 'anthropic'],
    ['sk-', 'openai'],
    ['ghp_', 'github'],
    ['github_pat_', 'github'],
]

export function detectProviderFromKey(apiKey: string): string | null {
    for (const [prefix, providerId] of KEY_PREFIX_MAP) {
        if (apiKey.startsWith(prefix)) return providerId
    }
    return null
}

export function isKeyFormatValid(apiKey: string, providerId: string): boolean {
    const detected = detectProviderFromKey(apiKey)
    // If we can't detect a known prefix, we allow it (some valid keys might not have known prefixes or we might not know all prefixes)
    // If we DO detect a known prefix, it MUST match the providerId being connected.
    return detected === null || detected === providerId
}
