import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from './AuthContext';
import HomeShowcase from './components/HomeShowcase';
import MainPortal from './components/MainPortal';
import TodoApp from './components/TodoApp';
import VoiceNotes from './components/VoiceNotes';
import PasswordGenerator from './components/PasswordGenerator';
import AppleTimer from './components/AppleTimer';
import LegalPages from './components/LegalPages';
import ShieldGenExtensionLanding from './components/ShieldGenExtensionLanding';
import AIAgentPage from './components/AIAgentPage';
import AIMonitor from './components/AIMonitor';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeShowcase />} />
        <Route path="/todo" element={<TodoApp />} />
        <Route path="/portal" element={<MainPortal />} />
        <Route path="/voicenotes" element={<VoiceNotes />} />
        <Route path="/password" element={<PasswordGenerator />} />
        <Route path="/shield-extension" element={<ShieldGenExtensionLanding />} />
        <Route path="/timer" element={<AppleTimer />} />
        <Route path="/assistant" element={<AIAgentPage />} />
        <Route path="/ai-monitor" element={<AIMonitor />} />
        <Route path="/privacy" element={<LegalPages type="privacy" />} />
        <Route path="/terms" element={<LegalPages type="terms" />} />
      </Routes>
      <SpeedInsights />
    </AuthProvider>
  );
}

export default App;
