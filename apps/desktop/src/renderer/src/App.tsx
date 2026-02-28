import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { initStreamingManager } from './store/streaming-manager';
import AppLayout from './components/layout/AppLayout';
import Home from './screens/Home';
import Catalogue from './screens/Catalogue';
import Connection from './screens/Connection';
import TestWorkspace from './screens/TestWorkspace';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import Settings from './screens/Settings';
import MemoryScreen from './screens/MemoryScreen';
import ProvidersScreen from './screens/ProvidersScreen';
import CodeWorkspaceScreen from './screens/CodeWorkspaceScreen';
import Onboarding from './screens/Onboarding';
import ModelDetailScreen from './screens/ModelDetailScreen';
import NvidiaFleetScreen from './screens/NvidiaFleetScreen';

function App(): React.JSX.Element {
  const isOnboarded = useAppStore((state) => state.isOnboarded);
  const syncConnectedProviders = useAppStore((state) => state.syncConnectedProviders);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const loadAllModels = useAppStore((state) => state.loadAllModels);
  const zoomLevel = useAppStore((state) => state.zoomLevel);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);

  const ZOOM_STEPS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];

  // Apply zoom via native Electron webFrame — true browser-style scaling
  useEffect(() => {
    const factor = zoomLevel / 100;
    try {
      (window as any).dexterai?.zoom?.setFactor(factor);
    } catch {
      // Fallback for non-Electron environments
      (document.body.style as any).zoom = factor.toString();
    }
  }, [zoomLevel]);

  // Keyboard shortcuts for zoom (Cmd/Ctrl + / - / 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const currentZoom = useAppStore.getState().zoomLevel;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        e.stopPropagation();
        const next = ZOOM_STEPS.find(s => s > currentZoom) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
        setZoomLevel(next);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        e.stopPropagation();
        const prev = [...ZOOM_STEPS].reverse().find(s => s < currentZoom) ?? ZOOM_STEPS[0];
        setZoomLevel(prev);
      } else if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        setZoomLevel(100);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [setZoomLevel]);

  // Listen for zoom commands from main process menu accelerators
  useEffect(() => {
    const unsub = window.dexterai?.on('zoom:change' as any, (direction: string) => {
      const currentZoom = useAppStore.getState().zoomLevel;
      if (direction === 'in') {
        const next = ZOOM_STEPS.find(s => s > currentZoom) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
        setZoomLevel(next);
      } else if (direction === 'out') {
        const prev = [...ZOOM_STEPS].reverse().find(s => s < currentZoom) ?? ZOOM_STEPS[0];
        setZoomLevel(prev);
      } else if (direction === 'reset') {
        setZoomLevel(100);
      }
    });
    return () => unsub?.();
  }, [setZoomLevel]);

  // Initialize global streaming manager (IPC listeners + drain loop)
  useEffect(() => {
    const cleanup = initStreamingManager()
    return cleanup
  }, [])

  // Hydrate state from DB on app startup
  useEffect(() => {
    if (isOnboarded) {
      syncConnectedProviders();
      loadConversations();
      loadAllModels();
    }
  }, [isOnboarded]);

  return (
    <Routes>
      {!isOnboarded ? (
        <>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </>
      ) : (
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Catalogue />} />
          <Route path="chat" element={<ChatListScreen />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="catalogue/:modelId" element={<ModelDetailScreen />} />
          <Route path="nvidia-fleet" element={<NvidiaFleetScreen />} />
          <Route path="provider/:providerId" element={<Connection />} />
          <Route path="test/*" element={<TestWorkspace />} />
          <Route path="chat/:conversationId" element={<ChatScreen />} />
          <Route path="memory" element={<MemoryScreen />} />
          <Route path="code" element={<CodeWorkspaceScreen />} />
          <Route path="providers" element={<ProvidersScreen />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
