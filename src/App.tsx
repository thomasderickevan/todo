import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import MainPortal from './components/MainPortal';
import TodoApp from './components/TodoApp';
import VoiceNotes from './components/VoiceNotes';
import PasswordGenerator from './components/PasswordGenerator';
import AppleTimer from './components/AppleTimer';
import LegalPages from './components/LegalPages';
import ShieldGenExtensionLanding from './components/ShieldGenExtensionLanding';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainPortal />} />
        <Route path="/todo" element={<TodoApp />} />
        <Route path="/portal" element={<MainPortal />} />
        <Route path="/voicenotes" element={<VoiceNotes />} />
        <Route path="/password" element={<PasswordGenerator />} />
        <Route path="/shield-extension" element={<ShieldGenExtensionLanding />} />
        <Route path="/timer" element={<AppleTimer />} />
        <Route path="/privacy" element={<LegalPages type="privacy" />} />
        <Route path="/terms" element={<LegalPages type="terms" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
