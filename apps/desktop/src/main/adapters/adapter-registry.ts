import { BaseProviderAdapter } from './base.adapter';

export const AdapterRegistry = {
    adapters: new Map<string, BaseProviderAdapter>(),

    register(adapter: BaseProviderAdapter) {
        this.adapters.set(adapter.providerId, adapter);
    },

    get(providerId: string): BaseProviderAdapter {
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new Error(`No adapter found for provider: ${providerId}`);
        }
        return adapter;
    }
};
