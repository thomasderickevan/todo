import { Routes, Route } from 'react-router-dom';
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
import AirDraw from './components/AirDraw';
import VibeMatrix from './components/VibeMatrix';
import LifePulse from './components/LifePulse';
import CapitalFlow from './components/CapitalFlow';
import ZenPM from './components/ZenPM';

function App() {
  const isRepoHost = typeof window !== 'undefined' && (
    window.location.hostname.startsWith('repo.') ||
    window.location.hostname.startsWith('repo-') ||
    window.location.hostname.startsWith('zenpm.') ||
    window.location.hostname.startsWith('zenpm-') ||
    window.location.hostname.startsWith('koreader.') ||
    window.location.hostname.includes('-repo.')
  );

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={isRepoHost ? <ZenPM /> : <HomeShowcase />} />
        <Route path="/todo" element={<TodoApp />} />
        <Route path="/portal" element={<MainPortal />} />
        <Route path="/voicenotes" element={<VoiceNotes />} />
        <Route path="/password" element={<PasswordGenerator />} />
        <Route path="/shield-extension" element={<ShieldGenExtensionLanding />} />
        <Route path="/timer" element={<AppleTimer />} />
        <Route path="/assistant" element={<AIAgentPage />} />
        <Route path="/ai-monitor" element={<AIMonitor />} />
        <Route path="/airdraw" element={<AirDraw />} />
        <Route path="/vibematrix" element={<VibeMatrix />} />
        <Route path="/lifepulse" element={<LifePulse />} />
        <Route path="/finance" element={<CapitalFlow />} />
        <Route path="/capitalflow" element={<CapitalFlow />} />
        <Route path="/zenpm" element={<ZenPM />} />
        <Route path="/koreader" element={<ZenPM />} />
        <Route path="/repo" element={<ZenPM />} />
        <Route path="/privacy" element={<LegalPages type="privacy" />} />
        <Route path="/terms" element={<LegalPages type="terms" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
