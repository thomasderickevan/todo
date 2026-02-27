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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { speak, listen } = useVoiceAgent();

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
    } else if (!personDetected) {
      speak("Where are you? Come back to study.");
      setStatus('User Missing');
    } else {
      setStatus('Focused');
    }
  }, [model, isStudyMode, speak]);

  // Object detection interval
  useEffect(() => {
    let interval: any;
    if (isStudyMode && model) {
      interval = setInterval(detectObjects, 5000);
    }
    return () => clearInterval(interval);
  }, [isStudyMode, model, detectObjects]);

  const handleVoiceCommand = useCallback(() => {
    listen((command) => {
      if (command.includes('add task')) {
        const taskName = command.replace('add task', '').trim();
        if (taskName) {
          onAddTask(taskName);
          speak(`Added task ${taskName}`);
        }
      } else if (command.includes('clear list')) {
        onClearList();
        speak("List cleared.");
      }
    });
  }, [listen, onAddTask, onClearList, speak]);

  return (
    <div className="ai-monitor-card">
      <h3>AI Monitor</h3>
      <div className="video-preview">
        {isStudyMode ? (
          <video ref={videoRef} autoPlay muted playsInline width="200" />
        ) : (
          <div className="video-placeholder">Camera Off</div>
        )}
      </div>
      
      <div className={`status-badge ${status.toLowerCase().includes('focused') ? 'focused' : 'warning'}`}>
        Status: {status}
      </div>

      <div className="ai-controls">
        <button 
          className={`study-toggle ${isStudyMode ? 'on' : 'off'}`}
          onClick={() => setIsStudyMode(!isStudyMode)}
        >
          Study Mode: {isStudyMode ? 'ON' : 'OFF'}
        </button>
        
        <button className="listen-btn" onClick={handleVoiceCommand}>
          🎤 Voice Command
        </button>
      </div>

      <p className="ai-tip">Try saying "Add task Finish project"</p>
    </div>
  );
};

export default AIAssistant;
