import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './AIAssistant.css';
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
  const [status, setStatus] = useState('Standby');
  const [isUserMissing, setIsUserMissing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const missingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, listen } = useVoiceAgent();

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
          setLastResponse("I'm focused on your tasks. Ask me to add or clear them!");
      }
    });
  }, [speak, listen, onAddTask, onClearList]);

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
        setStatus('Error');
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
      setStatus('Distracted');
      setIsUserMissing(false);
      if (missingTimerRef.current) {
        clearTimeout(missingTimerRef.current);
        missingTimerRef.current = null;
      }
    } else if (!personDetected) {
      setStatus('Away');
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
    let interval: ReturnType<typeof setInterval>;
    if (isStudyMode && model) {
      interval = setInterval(detectObjects, 3000);
    } else {
      setTimeout(() => setIsUserMissing(false), 0);
    }
    return () => clearInterval(interval);
  }, [isStudyMode, model, detectObjects]);

  return (
    <>
      {isUserMissing && isStudyMode && (
        <div className="mc-warning-overlay">
          <div className="mc-warning-content">
            <h1 className="glitch-text" data-text="CAUTION: USER_MISSING">CAUTION: USER_MISSING</h1>
            <p>IMMEDIATE_RETURN_REQUIRED // MOMENTUM_AT_RISK</p>
            <div className="mc-warning-scanner"></div>
          </div>
        </div>
      )}
      
      <div className={`mc-ai-card ${isStudyMode ? 'active' : ''}`} id="assistant-section" style={{ '--app-color': '#FF00FF' } as React.CSSProperties}>
        <div className="mc-ai-header">
          <span className="mc-ai-badge">AGENT_V1</span>
          <div className={`mc-ai-status ${status.toLowerCase()}`}>
            <span className="mc-status-dot"></span>
            {status.toUpperCase()}
          </div>
        </div>

        <div className="mc-orb-view">
          <div className={`mc-orb ${status.toLowerCase()} ${isListening ? 'listening' : ''}`}>
            <div className="mc-orb-core"></div>
            <div className="mc-orb-ring"></div>
          </div>
        </div>

        <div className="mc-video-feed">
          {isStudyMode ? (
            <video ref={videoRef} autoPlay muted playsInline />
          ) : (
            <div className="mc-feed-off">
              <span className="mc-lock-icon">🔒</span>
              <p>FEED_ENCRYPTED</p>
            </div>
          )}
        </div>

        {lastResponse && (
          <div className="mc-ai-response">
            <span className="mc-ai-cursor">»</span>
            <p className="typewriter">{lastResponse.toUpperCase()}</p>
          </div>
        )}

        <div className="mc-ai-controls">
          <button 
            className={`mc-ai-toggle ${isStudyMode ? 'active' : ''}`}
            onClick={() => setIsStudyMode(!isStudyMode)}
          >
            {isStudyMode ? 'TERMINATE_SESSION' : 'INITIALIZE_AGENT'}
          </button>
          
          <button className={`mc-ai-voice ${isListening ? 'active' : ''}`} onClick={triggerVoiceListen}>
            <span className="mc-mic-icon">🎤</span>
          </button>
          
          <Link to="/ai-monitor" className="mc-ai-monitor-link">
            Open AI Monitor
          </Link>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;
