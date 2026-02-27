import { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { useVoiceAgent } from '../hooks/useVoiceAgent';

interface AIAssistantProps {
  onAddTask: (taskName: string) => void;
  onClearList: () => void;
}

const AIAssistant = ({ onAddTask, onClearList }: AIAssistantProps) => {
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [status, setStatus] = useState('Off');
  const [isUserMissing, setIsUserMissing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const missingTimerRef = useRef<any>(null);
  const { speak, listen, startWakeWordDetection } = useVoiceAgent();

  const getAIResponse = (query: string) => {
    const q = query.toLowerCase();
    if (q.includes('study tip') || q.includes('how to study')) {
      return "Try the Pomodoro technique: study for 25 minutes, then take a 5-minute break.";
    }
    if (q.includes('how to focus')) {
      return "Minimize distractions, keep your phone away, and try listening to Lo-Fi or white noise.";
    }
    if (q.includes('what is') || q.includes('explain')) {
      return "That's a great question! For detailed explanations, you can link my logic to the Gemini API, but for now, remember that consistency is the key to learning.";
    }
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return "Hello! I am your AI study companion. How can I help you today?";
    }
    return "I'm not sure about that specific topic yet, but I'm here to help you stay focused!";
  };

  // Initialize alarm
  useEffect(() => {
    alarmRef.current = new Audio('https://www.myinstants.com/media/sounds/hacker-alarm.mp3');
    alarmRef.current.loop = true;
    
    return () => {
      alarmRef.current?.pause();
      if (missingTimerRef.current) clearTimeout(missingTimerRef.current);
    };
  }, []);

  // Handle Voice Command Start
  const triggerVoiceListen = useCallback(() => {
    setIsListening(true);
    speak("Yes? I am listening.");
    
    // Stop wake word while listening for commands to avoid interference
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
    }

    listen((command) => {
      setIsListening(false);
      
      if (command.includes('add task')) {
        const taskName = command.replace('add task', '').trim();
        if (taskName) {
          onAddTask(taskName);
          speak(`Added task ${taskName}`);
          setLastResponse(`Added task: ${taskName}`);
        }
      } else if (command.includes('clear list')) {
        onClearList();
        speak("List cleared.");
        setLastResponse("I've cleared your todo list.");
      } else {
        // Handle as a general question
        const response = getAIResponse(command);
        setLastResponse(response);
        speak(response);
      }
      
      // Restart wake word detection after command is handled
      if (isStudyMode) {
        wakeWordRecognitionRef.current = startWakeWordDetection(triggerVoiceListen);
      }
    });
  }, [speak, listen, onAddTask, onClearList, isStudyMode, startWakeWordDetection]);

  // Start Wake Word Detection when in Study Mode
  useEffect(() => {
    if (isStudyMode && !isListening) {
      wakeWordRecognitionRef.current = startWakeWordDetection(triggerVoiceListen);
    }
    
    return () => {
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
    };
  }, [isStudyMode, isListening, startWakeWordDetection, triggerVoiceListen]);

  // Handle alarm playback
  useEffect(() => {
    if (isUserMissing && isStudyMode) {
      alarmRef.current?.play().catch(e => console.error("Alarm failed", e));
    } else {
      alarmRef.current?.pause();
      if (alarmRef.current) alarmRef.current.currentTime = 0;
    }
  }, [isUserMissing, isStudyMode]);

  // Load Model
  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  // Handle Camera Permissions & Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Access Error:", err);
        setStatus('Camera Error');
      }
    };

    if (isStudyMode) {
      startCamera();
    }

    return () => {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isStudyMode]);

  const detectObjects = useCallback(async () => {
    if (!model || !videoRef.current || !isStudyMode) return;

    const predictions = await model.detect(videoRef.current);
    
    const personDetected = predictions.some(p => p.class === 'person');
    const phoneDetected = predictions.some(p => p.class === 'cell phone');

    if (phoneDetected) {
      speak("Focus! Put your phone away.");
      setStatus('Distracted (Phone)');
      setIsUserMissing(false);
      if (missingTimerRef.current) {
        clearTimeout(missingTimerRef.current);
        missingTimerRef.current = null;
      }
    } else if (!personDetected) {
      setStatus('User Missing');
      // Only trigger warning after 5 seconds of being missing
      if (!missingTimerRef.current && !isUserMissing) {
        missingTimerRef.current = setTimeout(() => {
          setIsUserMissing(true);
          speak("Where are you? Come back to study.");
        }, 5000);
      }
    } else {
      setStatus('Focused');
      setIsUserMissing(false);
      if (missingTimerRef.current) {
        clearTimeout(missingTimerRef.current);
        missingTimerRef.current = null;
      }
    }
  }, [model, isStudyMode, speak, isUserMissing]);

  // Object detection interval
  useEffect(() => {
    let interval: any;
    if (isStudyMode && model) {
      interval = setInterval(detectObjects, 3000); // More frequent checks (3s)
    } else {
      setIsUserMissing(false);
    }
    return () => clearInterval(interval);
  }, [isStudyMode, model, detectObjects]);

  return (
    <>
      {isUserMissing && isStudyMode && (
        <div className="warning-overlay">
          <div className="warning-content">
            <h1>⚠️ CAUTION: USER MISSING</h1>
            <p>RETURN TO YOUR DESK IMMEDIATELY</p>
            <div className="warning-animation"></div>
          </div>
        </div>
      )}
      <div className="ai-monitor-card">
        <header className="ai-monitor-header">
          <h1>AI Agent</h1>
          <div className={`listening-indicator ${isListening ? 'active' : ''}`}></div>
        </header>

        <div className="video-preview">
          {isStudyMode ? (
            <video ref={videoRef} autoPlay muted playsInline width="100%" />
          ) : (
            <div className="video-placeholder">Camera Off</div>
          )}
        </div>
        
        <div className={`status-badge ${status.toLowerCase().includes('focused') ? 'focused' : 'warning'}`}>
          Status: {status}
        </div>

        {lastResponse && (
          <div className="ai-response-bubble">
            <p>{lastResponse}</p>
          </div>
        )}

        <div className="ai-controls">
          <button 
            className={`study-toggle ${isStudyMode ? 'on' : 'off'}`}
            onClick={() => setIsStudyMode(!isStudyMode)}
          >
            Study Mode: {isStudyMode ? 'ON' : 'OFF'}
          </button>
          
          <button className="listen-btn" onClick={triggerVoiceListen}>
            🎤 Manual Trigger
          </button>
        </div>

        <p className="ai-tip">Say "Hey" or "AI" to wake me up!</p>
      </div>
    </>
  );
};

export default AIAssistant;
