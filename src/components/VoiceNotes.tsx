import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import guestUserIcon from '../assets/guest-user.svg';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  doc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { useDriveSync } from '../hooks/useDriveSync';
import './VoiceNotes.css';

interface VoiceNote {
  id: string;
  text: string;
  summary: string;
  createdAt: number;
  userId: string;
}

const VoiceNotes: React.FC = () => {
  const { user, loading: authLoading, login, logout, googleAccessToken } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const { saveToDrive } = useDriveSync();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');

  // Sample API Key for AI Analysis (Placeholder as requested)
  const AI_API_KEY = "sk-endeavor-sample-key-1234567890abcdef";

  useEffect(() => {
    document.title = 'VoiceNotes | endeavor';
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Fetch notes from Firestore
  useEffect(() => {
    if (!user) {
      const localNotes = localStorage.getItem('local_voice_notes');
      if (localNotes) {
        setNotes(JSON.parse(localNotes));
      } else {
        setNotes([]);
      }
      return;
    }

    const q = query(
      collection(db, "voice_notes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VoiceNote[];
      setNotes(notesList);
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle local notes migration when user signs in
  useEffect(() => {
    if (user) {
      const localNotesStr = localStorage.getItem('local_voice_notes');
      if (localNotesStr) {
        const localNotes = JSON.parse(localNotesStr) as VoiceNote[];
        if (localNotes.length > 0) {
          const migrateNotes = async () => {
            const batch = writeBatch(db);
            localNotes.forEach((note) => {
              const newNoteRef = doc(collection(db, "voice_notes"));
              const { id, ...noteData } = note;
              batch.set(newNoteRef, { ...noteData, userId: user.uid });
            });
            await batch.commit();
            localStorage.removeItem('local_voice_notes');
          };
          migrateNotes().catch(console.error);
        }
      }
    }
  }, [user]);

  // Sync local notes to localStorage (only if guest)
  useEffect(() => {
    if (!user && notes.length > 0) {
      localStorage.setItem('local_voice_notes', JSON.stringify(notes));
    }
  }, [notes, user]);

  const stopRecording = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
  }, []);

  const saveNote = useCallback(async () => {
    const currentTranscript = transcriptRef.current;
    if (currentTranscript.trim()) {
      const newNote = {
        text: currentTranscript,
        summary: '',
        createdAt: Date.now(),
        userId: user?.uid || 'local-user'
      };

      if (user) {
        await addDoc(collection(db, "voice_notes"), newNote);
      } else {
        setNotes(prev => [{ id: Date.now().toString(), ...newNote }, ...prev]);
      }
      setTranscript('');
    }
  }, [user]);

  const handleStopAndSave = useCallback(async () => {
    await stopRecording();
    await saveNote();
  }, [stopRecording, saveNote]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        handleStopAndSave();
      }, 5000);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setTranscript('');
  }, [handleStopAndSave]);

  const deleteNote = async (id: string) => {
    if (user && isNaN(Number(id))) {
      await deleteDoc(doc(db, "voice_notes", id));
    } else {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const summarizeNote = async (note: VoiceNote) => {
    setIsAnalyzing(note.id);
    
    // Simulate AI API call using the placeholder key
    console.log("Using AI API Key:", AI_API_KEY);
    
    // Artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockSummary = "SUMMARY: " + (note.text.length > 50 ? note.text.substring(0, 50) + "..." : note.text) + " (AI Analyzed)";

    if (user && isNaN(Number(note.id))) {
      try {
        await setDoc(doc(db, "voice_notes", note.id), { ...note, summary: mockSummary });
      } catch (err) {
        console.error("Error updating summary in Firestore:", err);
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, summary: mockSummary } : n));
      }
    } else {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, summary: mockSummary } : n));
    }
    
    setIsAnalyzing(null);
  };

  const handleSyncToDrive = async (note: VoiceNote) => {
    if (!user) {
      alert("Please sign in to save to Google Drive");
      return;
    }
    
    if (!googleAccessToken) {
      alert("Google Drive access is required. Please sign out and sign in again to authorize.");
      return;
    }

    setSyncingId(note.id);
    const fileName = `Voice Note - ${new Date(note.createdAt).toLocaleString()}`;
    const content = `Date: ${new Date(note.createdAt).toLocaleString()}\n\nNote:\n${note.text}${note.summary ? `\n\nAI Summary:\n${note.summary}` : ''}`;
    
    await saveToDrive(fileName, content);
    setSyncingId(null);
  };

  if (authLoading) return <div className="loading-screen">🌀 Loading Voice Engine...</div>;

  return (
    <>
      <Navbar />
      <div className="voice-container">
            <div className="user-nav">
          {!authLoading && (
            user ? (
              <div className="user-menu">
                <img 
                  src={user.photoURL || guestUserIcon} 
                  alt="Profile" 
                  className="nav-avatar" 
                  referrerPolicy="no-referrer"
                />
                <span className="user-name">{user.displayName?.split(' ')[0] || 'User'}</span>
                <button className="logout-btn-nav" onClick={() => logout()}>Sign Out</button>
              </div>
            ) : (
              <button className="login-btn-nav" onClick={() => login()}>Sign In</button>
            )
          )}
        </div>

        <div className="recording-section">
          <div className={`record-button ${isRecording ? 'recording' : ''}`} onClick={isRecording ? handleStopAndSave : startRecording}>
            <div className="record-icon">🎤</div>
            <div className="pulse"></div>
          </div>
          <p className="record-status">{isRecording ? "Listening... Tap to stop" : "Tap to start recording"}</p>
          {isRecording && transcript && (
            <div className="live-transcript">
              {transcript}
            </div>
          )}
        </div>

        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-date">{new Date(note.createdAt).toLocaleString()}</div>
              <div className="note-text">{note.text}</div>
              {note.summary && (
                <div className="note-summary">
                  <strong>✨ AI Insight:</strong> {note.summary}
                </div>
              )}
              <div className="note-actions">
                {!note.summary && (
                  <button 
                    className="ai-btn" 
                    onClick={() => summarizeNote(note)}
                    disabled={isAnalyzing === note.id}
                  >
                    {isAnalyzing === note.id ? "Analyzing..." : "Summarize with AI"}
                  </button>
                )}
                <button 
                  className="sync-btn" 
                  onClick={() => handleSyncToDrive(note)}
                  disabled={syncingId === note.id}
                >
                  {syncingId === note.id ? "Syncing..." : "Sync to Drive"}
                </button>
                <button className="del-btn" onClick={() => deleteNote(note.id)}>Delete</button>
              </div>
            </div>
          ))}
          {notes.length === 0 && !isRecording && (
            <div className="empty-voice-state">
              <p>No voice notes yet. Speak your mind!</p>
            </div>
          )}
        </div>
        <LegalFooter />
      </div>
    </>
  );
};

export default VoiceNotes;
