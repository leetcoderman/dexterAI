import { ipcMain } from 'electron';
import { RegistryManager } from '../registry/registry-manager';

export function registerRegistryHandlers() {
    ipcMain.handle('registry:getModels', async (_, category?: string) => {
        try {
            const registry = await RegistryManager.loadRegistry();
            if (category) {
                return registry.models.filter(m => m.category === category);
            }
            return registry.models;
        } catch (e) {
            console.error('Failed to load models in IPC handler:', e);
            return [];
        }
    });

    ipcMain.handle('registry:checkForUpdate', async () => {
        return { hasUpdate: false, version: '2026.02.1' };
    });

    ipcMain.handle('registry:applyUpdate', async () => {
        // no-op for now
    });
}
