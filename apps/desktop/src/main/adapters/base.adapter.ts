import { VerifyResult, TestRequest, ProviderCredentials, StreamChunk, EvaluationMetrics, ProviderError } from '@dexterai/registry-types';
import { EventEmitter } from 'events';
import { sleep } from '@dexterai/shared-utils';

export interface IPCEmitter extends EventEmitter {
    emit(event: 'test:chunk', chunk: StreamChunk): boolean;
    emit(event: 'test:done', metrics: EvaluationMetrics): boolean;
    emit(event: 'test:error', error: ProviderError): boolean;
}

export interface RateLimitInfo {
    remaining: number;
    resetAt: string | null;
    limitType: string;
}

export abstract class BaseProviderAdapter {
    abstract readonly providerId: string;

    abstract verify(credentials: ProviderCredentials): Promise<VerifyResult>;

    abstract execute(
        request: TestRequest,
        credentials: ProviderCredentials,
        emitter: IPCEmitter
    ): Promise<void>;

    protected async withRetry<T>(
        fn: () => Promise<T>,
        maxAttempts = 3,
        baseDelayMs = 1000
    ): Promise<T> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                if (err.status === 429) {
                    const retryAfter = parseInt(err.headers?.['retry-after'] ?? '1') * 1000;
                    const delay = Math.max(retryAfter, baseDelayMs * Math.pow(2, attempt - 1));
                    if (attempt < maxAttempts) await sleep(delay);
                } else if (attempt === maxAttempts || !this.isRetryable(err.status)) {
                    throw err;
                }
            }
        }
        throw new Error('Retries exceeded');
    }

    protected extractRateLimit(headers: Headers): RateLimitInfo {
        return {
            remaining: parseInt(headers.get('x-ratelimit-remaining-requests') ?? '-1'),
            resetAt: headers.get('x-ratelimit-reset-requests') ?? null,
            limitType: 'requests'
        };
    }

    protected isRetryable(status?: number): boolean {
        if (!status) return false;
        return status === 429 || status >= 500;
    }

    protected mapError(err: any): Omit<ProviderError, 'requestId'> {
        // Special Preflight Error Intercept for NVIDIA NIM keys routed to OpenAI
        if (
            err?.status === 401 &&
            err?.message?.includes('nvapi-') &&
            this.providerId === 'openai'
        ) {
            return {
                code: 'WRONG_PROVIDER',
                message: 'This looks like an NVIDIA NIM key (nvapi-). Please use the NVIDIA NIM connector instead.',
                actionLabel: 'Switch to NVIDIA NIM',
                actionTarget: 'connect/nvidia_nim', // Currently the UI routes don't strictly use this target format, but we'll include it for future-proofing
                isRetryable: false
            };
        }

        return {
            code: err?.error?.type || err?.name || err?.code || 'UNKNOWN_ERROR',
            message: err?.message || 'An unknown error occurred.',
            isRetryable: this.isRetryable(err?.status)
        };
    }
}
