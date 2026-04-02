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
  const { saveToDrive, isSyncing } = useDriveSync();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  const recognitionRef = useRef<null | any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    document.title = '✦ endeavor • VoiceNotes';
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
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VoiceNote[];
      // Sort client-side to avoid the need for a composite index (userId + createdAt)
      notesList.sort((a, b) => b.createdAt - a.createdAt);
      setNotes(notesList);
    }, (error) => {
      console.error("Firestore error:", error);
      if (error.code === 'failed-precondition') {
        console.warn("Firestore query failed: Missing index. Sorting in memory instead.");
      }
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
              const { id: _unusedId, ...noteData } = note;
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
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Recognition stop error:", e);
      }
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
  }, []);

  const saveNote = useCallback(async (finalTranscript?: string) => {
    const textToSave = (finalTranscript ?? transcriptRef.current).trim();
    console.log("Attempting to save note. Text length:", textToSave.length);
    
    if (textToSave) {
      const newNote = {
        text: textToSave,
        summary: '',
        createdAt: Date.now(),
        userId: user?.uid || 'local-user'
      };

      try {
        if (user) {
          await addDoc(collection(db, "voice_notes"), newNote);
          console.log("Note saved to Firestore.");
        } else {
          setNotes(prev => [{ id: Date.now().toString(), ...newNote }, ...prev]);
          console.log("Note saved locally.");
        }
        setTranscript('');
      } catch (err) {
        console.error("Error saving note:", err);
        alert("Failed to save note.");
      }
    } else {
      console.log("Empty transcript, skipping save.");
    }
  }, [user]);

  const handleStopAndSave = useCallback(async (finalTranscript?: string) => {
    console.log("Stopping and saving...");
    await stopRecording();
    await saveNote(finalTranscript);
  }, [stopRecording, saveNote]);

  const startRecording = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          console.log("Auto-saving due to silence...");
          handleStopAndSave(fullTranscript);
        }, 8000); 
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access was denied. Please check your browser permissions.");
        } else if (event.error === 'network') {
          alert("Network error occurred. Please check your connection.");
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log("Speech Recognition ended.");
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      alert("Could not start voice recognition. Please try again.");
    }
  }, [handleStopAndSave]);

  const deleteNote = useCallback(async (note: VoiceNote) => {
    console.log("Attempting to delete note:", note.id, "Owner:", note.userId);
    
    try {
      if (user && note.userId === user.uid) {
        console.log("Deleting Firestore note...");
        await deleteDoc(doc(db, "voice_notes", note.id));
        // State will be updated by onSnapshot listener
      } else {
        console.log("Deleting local/guest note...");
        setNotes(prev => {
          const updated = prev.filter(n => n.id !== note.id);
          if (!user) {
            localStorage.setItem('local_voice_notes', JSON.stringify(updated));
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Could not delete note. Please try again.");
    }
  }, [user]);

  const summarizeNote = async (note: VoiceNote) => {
    setIsAnalyzing(note.id);
    
    try {
      // simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockSummary = "SUMMARY: " + (note.text.length > 50 ? note.text.substring(0, 50) + "..." : note.text) + " (AI Analyzed)";

      if (user && isNaN(Number(note.id))) {
        await setDoc(doc(db, "voice_notes", note.id), { ...note, summary: mockSummary });
      } else {
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, summary: mockSummary } : n));
      }
    } catch (err) {
      console.error("Summarization error:", err);
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleSyncToDrive = async (note: VoiceNote) => {
    if (!user) {
      alert("Please sign in to save to Google Drive");
      return;
    }
    
    if (!googleAccessToken) {
      alert("Google Drive access is required. Please sign out and sign in again to re-authorize.");
      return;
    }

    setSyncingId(note.id);
    const fileName = `Voice Note - ${new Date(note.createdAt).toLocaleString()}`;
    const content = `Date: ${new Date(note.createdAt).toLocaleString()}\n\nNote:\n${note.text}${note.summary ? `\n\nAI Summary:\n${note.summary}` : ''}`;
    
    await saveToDrive(fileName, content);
    setSyncingId(null);
  };

  const handleSyncAllToDrive = async () => {
    if (!googleAccessToken) {
      alert("Please re-authorize Google Drive access by signing out and in again.");
      return;
    }

    const backupData = JSON.stringify(notes, null, 2);
    await saveToDrive('endeavor_voice_notes_backup.json', backupData);
  };

  if (authLoading) return <div className="loading-screen">🌀 Loading Voice Engine...</div>;

  return (
    <>
      <Navbar />
      <div className="voice-container">
        <div className="voice-auth-header">
          {!authLoading && (
            user ? (
              <div className="user-pill">
                <button 
                  className="sync-pill-btn" 
                  onClick={handleSyncAllToDrive} 
                  disabled={isSyncing || notes.length === 0}
                >
                  {isSyncing ? 'Syncing...' : 'Sync All'}
                </button>
                <img 
                  src={user.photoURL || guestUserIcon} 
                  alt="Profile" 
                  className="user-pill-avatar" 
                  referrerPolicy="no-referrer"
                />
                <span className="user-pill-name">{user.displayName?.split(' ')[0] || 'User'}</span>
                <button className="logout-pill-btn" onClick={() => logout()}>Sign Out</button>
              </div>
            ) : (
              <button className="login-pill-btn" onClick={() => login()}>Sign In with Google</button>
            )
          )}
        </div>

        <div className="recording-section">
          <div 
            className={`record-button ${isRecording ? 'recording' : ''}`} 
            onClick={() => isRecording ? handleStopAndSave() : startRecording()}
          >
            <div className="record-icon">🎤</div>
            <div className="pulse"></div>
          </div>
          <p className="record-status">{isRecording ? "Listening... Tap to stop" : "Tap to start recording"}</p>
          {!isRecording && !googleAccessToken && user && (
            <p className="auth-warning">⚠️ Drive access expired. Sign out and in to fix.</p>
          )}
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
                <button className="del-btn" onClick={() => deleteNote(note)}>Delete</button>
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
