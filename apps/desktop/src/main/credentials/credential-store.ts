import keytar from 'keytar'
import { ProviderCredentials } from '@dexterai/registry-types'

const SERVICE_NAME = 'dexterai'

// Key format: '{providerId}:{appInstanceId}'
function buildAccount(providerId: string): string {
  // Try to generate an app instance ID, or default to generic string for now
  let appInstanceId = 'default'
  try {
    // Usually stored in userData, let's keep it simple for now or fetch it
    appInstanceId = 'local-dev'
  } catch (err) {}

  return `${providerId}:${appInstanceId}`
}

async function getExtras(account: string): Promise<Record<string, string>> {
  const allCreds = await keytar.findCredentials(SERVICE_NAME)
  const extraCreds = allCreds.filter((c) => c.account.startsWith(`${account}:`))
  const extras: Record<string, string> = {}
  for (const c of extraCreds) {
    const key = c.account.split(':')[2] // Extracts the extra key
    if (key) extras[key] = c.password
  }
  return extras
}

export const CredentialStore = {
  async save(providerId: string, apiKey: string, extras?: Record<string, string>) {
    const account = buildAccount(providerId)
    await keytar.setPassword(SERVICE_NAME, account, apiKey)
    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        await keytar.setPassword(SERVICE_NAME, `${account}:${key}`, value)
      }
    }
  },

  async get(providerId: string): Promise<ProviderCredentials> {
    const account = buildAccount(providerId)
    const apiKey = await keytar.getPassword(SERVICE_NAME, account)
    if (!apiKey) throw new Error(`No credentials found for provider: ${providerId}`)

    return {
      apiKey,
      extras: await getExtras(account)
    }
  },

  async delete(providerId: string) {
    const account = buildAccount(providerId)
    await keytar.deletePassword(SERVICE_NAME, account)

    // Delete all extra field entries too
    const allCreds = await keytar.findCredentials(SERVICE_NAME)
    for (const c of allCreds.filter((c) => c.account.startsWith(`${account}:`))) {
      await keytar.deletePassword(SERVICE_NAME, c.account)
    }
  },

  async exists(providerId: string): Promise<boolean> {
    const account = buildAccount(providerId)
    const pass = await keytar.getPassword(SERVICE_NAME, account)
    return !!pass
  }
}
