import { ipcMain } from 'electron';
import { AdapterRegistry } from '../adapters/adapter-registry';
import { CredentialStore } from '../credentials/credential-store';
import { TestRequest, EvaluationMetrics } from '@dexterai/registry-types';
import { IPCEmitter } from '../adapters/base.adapter';
import { getDatabase } from '../db/database';
import EventEmitter from 'events';
import { saveTestRun } from './history.ipc';

const ActiveRequests = new Map<string, AbortController>();

class ProviderEmitter extends EventEmitter implements IPCEmitter {
    constructor(private sender: Electron.WebContents) {
        super();
        this.on('test:chunk', (chunk) => this.sender.send('test:chunk', chunk));
        this.on('test:done', (metrics) => this.sender.send('test:done', metrics));
        this.on('test:error', (error) => this.sender.send('test:error', error));
    }
}

export function registerProviderHandlers() {
    ipcMain.handle('provider:verify', async (_, providerId: string, _modelId: string) => {
        try {
            const adapter = AdapterRegistry.get(providerId);
            const credentials = await CredentialStore.get(providerId);
            const result = await adapter.verify(credentials);

            if (result.success) {
                // Insert into connections table so listConnected survives restarts
                try {
                    const db = getDatabase();
                    db.prepare(
                        `INSERT OR REPLACE INTO connections (provider_id, model_ids, connected_at, last_verified)
                         VALUES (?, ?, ?, ?)`
                    ).run(providerId, '[]', Date.now(), Date.now());
                } catch (dbErr) {
                    console.error('Failed to persist connection:', dbErr);
                }
            } else {
                // Verification failed — remove stored key so stale creds don't linger
                try {
                    await CredentialStore.delete(providerId);
                } catch { /* ignore if key didn't exist */ }
            }

            return result;
        } catch (err: any) {
            // Clean up key on unexpected errors too
            try {
                await CredentialStore.delete(providerId);
            } catch { /* ignore */ }

            return {
                success: false,
                error: {
                    code: err.code || 'VERIFY_ERROR',
                    message: err.message || 'An unknown error occurred during verification.',
                    isRetryable: false
                }
            };
        }
    });

    ipcMain.handle('provider:test', async (event, request: TestRequest) => {
        const emitter = new ProviderEmitter(event.sender);

        let providerId = 'unknown';
        const startTime = Date.now();
        let errorMsg: string | null = null;
        let outMetrics: EvaluationMetrics | null = null;
        let accumulatedOutput = '';

        emitter.on('test:chunk', (chunk: any) => {
            if (chunk.text) accumulatedOutput += chunk.text;
        });

        emitter.on('test:done', (metrics: EvaluationMetrics) => {
            outMetrics = { ...metrics, requestId: request.requestId };
            saveTestRun({
                id: request.requestId,
                model_id: request.modelId,
                provider_id: providerId,
                category: request.category,
                params_json: JSON.stringify(request.params || {}),
                output_summary: accumulatedOutput.substring(0, 500),
                metrics_json: JSON.stringify(metrics || {}),
                ran_at: startTime,
                error: null
            });
        });

        emitter.on('test:error', (errorInput: any) => {
            errorMsg = errorInput.message;
            saveTestRun({
                id: request.requestId,
                model_id: request.modelId,
                provider_id: providerId,
                category: request.category,
                params_json: JSON.stringify(request.params || {}),
                output_summary: accumulatedOutput.substring(0, 500),
                metrics_json: '{}',
                ran_at: startTime,
                error: errorMsg
            });
        });

        try {
            const adapter = AdapterRegistry.get(request.providerId);
            providerId = adapter.providerId;
            const credentials = await CredentialStore.get(adapter.providerId);

            const abort = new AbortController();
            ActiveRequests.set(request.requestId, abort);

            await adapter.execute(request, credentials, emitter);
        } catch (err: any) {
            if (!errorMsg && !outMetrics) {
                emitter.emit('test:error', {
                    requestId: request.requestId,
                    code: err.code || 'UNKNOWN_ERROR',
                    message: err.message
                });
            }
        } finally {
            ActiveRequests.delete(request.requestId);
        }
    });

    ipcMain.handle('provider:cancel', async (_, requestId: string) => {
        ActiveRequests.get(requestId)?.abort();
    });
}
