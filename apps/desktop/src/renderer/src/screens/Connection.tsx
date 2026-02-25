import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Key, ShieldCheck, AlertCircle, LogOut, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';
import { detectProviderFromKey } from '@dexterai/shared-utils';

export default function Connection() {
    const { providerId } = useParams<{ providerId: string }>();
    const connectedProviders = useAppStore(state => state.connectedProviders);
    const addConnectedProvider = useAppStore(state => state.addConnectedProvider);
    const removeConnectedProvider = useAppStore(state => state.removeConnectedProvider);
    const syncConnectedProviders = useAppStore(state => state.syncConnectedProviders);

    const [apiKey, setApiKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const isConnected = providerId ? connectedProviders.includes(providerId) : false;
    const providerLabel = providerId
        ? providerId.charAt(0).toUpperCase() + providerId.slice(1)
        : '';

    const handleVerify = async () => {
        if (!apiKey.trim() || !providerId) return;
        setIsVerifying(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            await window.dexterai.credentials.save(providerId, apiKey);
            const result = await window.dexterai.provider.verify(providerId, 'default');

            if (result?.success) {
                addConnectedProvider(providerId);
                await syncConnectedProviders();
                setSuccessMsg('Successfully connected and verified.');
                setApiKey('');
            } else {
                setErrorMsg(result?.error?.message || 'Failed to verify API key.');
                await window.dexterai.credentials.delete(providerId);
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'An unexpected error occurred.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReVerify = async () => {
        if (!providerId) return;
        setIsVerifying(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const result = await window.dexterai.provider.verify(providerId, 'default');
            if (result?.success) {
                await syncConnectedProviders();
                setSuccessMsg('Credentials verified successfully.');
            } else {
                setErrorMsg(result?.error?.message || 'Verification failed.');
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Verification error.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDisconnect = async () => {
        if (!providerId) return;
        if (confirm(`Disconnect ${providerLabel}? This will remove your stored API key.`)) {
            await window.dexterai.credentials.delete(providerId);
            removeConnectedProvider(providerId);
            setSuccessMsg('');
            setErrorMsg('');
        }
    };

    if (!providerId) {
        return <div className="p-6">Invalid Provider</div>;
    }

    // State B — Connected
    if (isConnected) {
        return (
            <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
                <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-lg shadow-sm text-center">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{providerLabel} Connected</h2>
                    <p className="text-gray-500 mb-8">Your API key is stored securely in the OS keychain.</p>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                        <div className="p-4 border border-border rounded-xl bg-background">
                            <p className="text-sm font-medium text-gray-500">Status</p>
                            <p className="text-base font-semibold flex items-center text-green-500 mt-1">
                                <CheckCircle className="w-4 h-4 mr-2" /> Verified
                            </p>
                        </div>
                        <div className="p-4 border border-border rounded-xl bg-background">
                            <p className="text-sm font-medium text-gray-500">Provider</p>
                            <p className="text-base font-semibold mt-1">{providerLabel}</p>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={handleReVerify}
                            disabled={isVerifying}
                            className="flex-1 py-2 px-4 border border-border rounded-lg font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Re-verify
                        </button>
                        <button
                            onClick={handleDisconnect}
                            className="flex-1 py-2 px-4 border border-red-500/20 text-red-500 rounded-lg font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Disconnect
                        </button>
                    </div>

                    {successMsg && <p className="mt-4 text-sm text-green-500">{successMsg}</p>}
                    {errorMsg && <p className="mt-4 text-sm text-red-500">{errorMsg}</p>}
                </div>
            </div>
        );
    }

    // State A — Not Connected
    return (
        <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
            <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <Key className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Connect {providerLabel}</h2>
                        <p className="text-sm text-gray-500">Keys are stored in your OS keychain, never in the cloud.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            placeholder={
                                providerId === 'openai'
                                    ? 'sk-...'
                                    : providerId === 'nvidia_nim'
                                        ? 'nvapi-... (1 key, 160+ models)'
                                        : 'Enter your API key'
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
                        />
                    </div>

                    {detectProviderFromKey(apiKey) && detectProviderFromKey(apiKey) !== providerId && (
                        <div className="flex items-start space-x-2 text-yellow-600 bg-yellow-50 dark:text-yellow-500 dark:bg-yellow-500/10 p-3 rounded-md text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            {detectProviderFromKey(apiKey) === 'nvidia_nim' ? (
                                <p>This looks like an NVIDIA NIM key (nvapi-). To use NVIDIA NIM, switch to the NVIDIA NIM connector in the sidebar.</p>
                            ) : (
                                <p>This key format ({detectProviderFromKey(apiKey)}) doesn't match the current provider ({providerId}).</p>
                            )}
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-start space-x-2 text-red-500 bg-red-500/10 p-3 rounded-md text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    {successMsg && (
                        <p className="text-sm text-green-500 font-medium">{successMsg}</p>
                    )}

                    <button
                        onClick={handleVerify}
                        disabled={isVerifying || !apiKey.trim() || (detectProviderFromKey(apiKey) !== null && detectProviderFromKey(apiKey) !== providerId)}
                        className="w-full py-2 px-4 bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center mt-2"
                    >
                        {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                        {isVerifying ? 'Verifying...' : 'Connect & Verify'}
                    </button>
                </div>
            </div>
        </div>
    );
}
