import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { Registry } from '@dexterai/registry-types';

const REGISTRY_CDN_URL = 'https://registry.dexterai.app/registry.json';
const BUNDLED_REGISTRY_PATH = path.join(__dirname, '../../../../registry/registry.json');

export const RegistryManager = {
    getCachePath() {
        return path.join(app.getPath('userData'), 'registry-cache.json');
    },

    isNewerVersion(remoteVersion: string, cachedVersion: string): boolean {
        return remoteVersion !== cachedVersion; // Simple equality check for now
    },

    async loadRegistry(): Promise<Registry> {
        // 1. Try remote registry
        try {
            const response = await fetch(REGISTRY_CDN_URL, {
                headers: { 'Cache-Control': 'max-age=3600' },
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                const remote = await response.json() as Registry;

                // Cache logic
                let cachedVersion = '0.0.0';
                try {
                    const cached = JSON.parse(await fs.readFile(this.getCachePath(), 'utf8'));
                    cachedVersion = cached.registry_version;
                } catch { }

                if (this.isNewerVersion(remote.registry_version, cachedVersion)) {
                    await fs.writeFile(this.getCachePath(), JSON.stringify(remote));
                    return remote;
                }
            }
        } catch {
            // Network unavailable — fall through
        }

        // 2. Try local cache
        try {
            const cached = JSON.parse(await fs.readFile(this.getCachePath(), 'utf8'));
            return cached;
        } catch {
            // No cache — fall through
        }

        // 3. Bundled fallback
        try {
            return JSON.parse(await fs.readFile(BUNDLED_REGISTRY_PATH, 'utf8'));
        } catch (e) {
            // If we are developing locally and don't have it bundled yet, return empty structure
            return { registry_version: "1.0.0", models: [] };
        }
    }
};
