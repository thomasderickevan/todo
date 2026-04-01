import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import MainPortal from './components/MainPortal';
import TodoApp from './components/TodoApp';
import VoiceNotes from './components/VoiceNotes';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainPortal />} />
        <Route path="/todo" element={<TodoApp />} />
        <Route path="/voicenotes" element={<VoiceNotes />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
