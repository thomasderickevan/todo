import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import MainPortal from './components/MainPortal';
import TodoApp from './components/TodoApp';
import VoiceNotes from './components/VoiceNotes';
import PasswordGenerator from './components/PasswordGenerator';
import AppleTimer from './components/AppleTimer';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainPortal />} />
        <Route path="/todo" element={<TodoApp />} />
        <Route path="/voicenotes" element={<VoiceNotes />} />
        <Route path="/password" element={<PasswordGenerator />} />
        <Route path="/timer" element={<AppleTimer />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
