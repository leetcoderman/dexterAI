import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import AppLayout from './components/layout/AppLayout';
import Home from './screens/Home';
import Catalogue from './screens/Catalogue';
import Connection from './screens/Connection';
import TestWorkspace from './screens/TestWorkspace';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import Settings from './screens/Settings';
import MemoryScreen from './screens/MemoryScreen';
import Onboarding from './screens/Onboarding';

function App(): React.JSX.Element {
  const isOnboarded = useAppStore((state) => state.isOnboarded);
  const syncConnectedProviders = useAppStore((state) => state.syncConnectedProviders);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const loadAllModels = useAppStore((state) => state.loadAllModels);

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
          <Route index element={<ChatListScreen />} />
          <Route path="explore" element={<Home />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="provider/:providerId" element={<Connection />} />
          <Route path="test/:modelId" element={<TestWorkspace />} />
          <Route path="chat" element={<ChatListScreen />} />
          <Route path="chat/:conversationId" element={<ChatScreen />} />
          <Route path="memory" element={<MemoryScreen />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
