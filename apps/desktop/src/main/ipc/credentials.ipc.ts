import { ipcMain } from 'electron';
import { CredentialStore } from '../credentials/credential-store';
import { getDatabase } from '../db/database';

export function registerCredentialHandlers() {
    ipcMain.handle('credentials:save', async (_, providerId: string, key: string, extras?: Record<string, string>) => {
        await CredentialStore.save(providerId, key, extras);
        return true;
    });

    ipcMain.handle('credentials:delete', async (_, providerId: string) => {
        await CredentialStore.delete(providerId);
        // Also remove from connections table
        try {
            const db = getDatabase();
            db.prepare('DELETE FROM connections WHERE provider_id = ?').run(providerId);
        } catch (e) {
            console.error('Failed to delete connection record:', e);
        }
    });

    ipcMain.handle('credentials:exists', async (_, providerId: string) => {
        return await CredentialStore.exists(providerId);
    });

    ipcMain.handle('credentials:listConnected', async () => {
        try {
            const db = getDatabase();
            const rows = db.prepare('SELECT provider_id FROM connections').all() as { provider_id: string }[];
            return rows.map(r => r.provider_id);
        } catch {
            return [];
        }
    });
}
