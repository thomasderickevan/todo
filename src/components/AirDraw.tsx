/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './AirDraw.css';

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

const AirDraw: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Loading Core Dependencies...');
  const [color, setColor] = useState('#00ffcc');
  const [thickness, setThickness] = useState(6);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);

  // Resize handler
  const resizeCanvases = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    const cursorCanvas = cursorCanvasRef.current;
    if (drawingCanvas && cursorCanvas) {
      // Keep existing drawing content during resize by copying it
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = drawingCanvas.width;
      tempCanvas.height = drawingCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(drawingCanvas, 0, 0);
      }

      drawingCanvas.width = window.innerWidth;
      drawingCanvas.height = window.innerHeight;
      cursorCanvas.width = window.innerWidth;
      cursorCanvas.height = window.innerHeight;

      // Draw content back
      const drawingCtx = drawingCanvas.getContext('2d');
      if (drawingCtx && tempCanvas.width > 0) {
        drawingCtx.drawImage(tempCanvas, 0, 0);
      }
    }
  }, []);

  // Helper to check if a finger is extended
  const isFingerUp = (landmarks: any, tipIndex: number, mcpIndex: number) => {
    return landmarks[tipIndex].y < landmarks[mcpIndex].y;
  };

  // Setup scripts loading
  useEffect(() => {
    document.title = '✦ endeavor • AirDraw';
    
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
    ])
      .then(() => {
        setScriptsLoaded(true);
        setStatus('Initializing Camera...');
      })
      .catch((err) => {
        console.error('Failed to load MediaPipe:', err);
        setStatus('Dependency Load Error');
      });

    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    const currentVideo = videoRef.current;

    return () => {
      window.removeEventListener('resize', resizeCanvases);
      // Clean up MediaPipe camera
      if (cameraInstanceRef.current) {
        try {
          cameraInstanceRef.current.stop();
        } catch (e) {
          console.warn('Error stopping camera:', e);
        }
      }
      if (handsInstanceRef.current) {
        try {
          handsInstanceRef.current.close();
        } catch (e) {
          console.warn('Error closing hands instance:', e);
        }
      }
      // Stop webcam tracks explicitly to release browser camera icon
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      document.title = 'Portal • endeavor';
    };
  }, [resizeCanvases]);

  // Main processing function called by MediaPipe
  const onResults = useCallback((results: any) => {
    const cursorCanvas = cursorCanvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!cursorCanvas || !drawingCanvas) return;

    const cursorCtx = cursorCanvas.getContext('2d');
    const drawingCtx = drawingCanvas.getContext('2d');
    if (!cursorCtx || !drawingCtx) return;

    // Clear cursor every frame
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Determine gestures
      const indexUp = isFingerUp(landmarks, 8, 5);
      const middleUp = isFingerUp(landmarks, 12, 9);
      const ringUp = isFingerUp(landmarks, 16, 13);
      const pinkyUp = isFingerUp(landmarks, 20, 17);

      let mode: 'DRAW' | 'ERASE' | 'PAUSE' = 'PAUSE';

      if (indexUp && middleUp && ringUp && pinkyUp) {
        mode = 'ERASE';
      } else if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        mode = 'DRAW';
      }

      // Update Status and styling based on mode
      if (mode === 'DRAW') {
        setStatus('DRAWING');
      } else if (mode === 'ERASE') {
        setStatus('ERASING...');
      } else {
        setStatus('PAUSED');
      }

      // Calculate mirrored coordinates
      const x = landmarks[8].x * drawingCanvas.width;
      const y = landmarks[8].y * drawingCanvas.height;

      // Draw cursor circle on cursor Canvas
      cursorCtx.beginPath();
      cursorCtx.arc(x, y, thickness * 1.5, 0, 2 * Math.PI);
      cursorCtx.fillStyle = mode === 'DRAW' ? color : (mode === 'ERASE' ? '#ff3333' : 'white');
      cursorCtx.shadowBlur = 10;
      cursorCtx.shadowColor = mode === 'DRAW' ? color : 'white';
      cursorCtx.fill();

      // Actions
      if (mode === 'ERASE') {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        lastXRef.current = null;
        lastYRef.current = null;
      } else if (mode === 'DRAW') {
        if (lastXRef.current !== null && lastYRef.current !== null) {
          drawingCtx.beginPath();
          drawingCtx.moveTo(lastXRef.current, lastYRef.current);
          drawingCtx.lineTo(x, y);

          // Neon Glow Styling
          drawingCtx.strokeStyle = color;
          drawingCtx.lineWidth = thickness;
          drawingCtx.lineCap = 'round';
          drawingCtx.lineJoin = 'round';
          drawingCtx.shadowBlur = thickness * 3;
          drawingCtx.shadowColor = color;

          drawingCtx.stroke();
        }
        lastXRef.current = x;
        lastYRef.current = y;
      } else {
        lastXRef.current = null;
        lastYRef.current = null;
      }
    } else {
      setStatus('HAND_NOT_FOUND');
      lastXRef.current = null;
      lastYRef.current = null;
    }
  }, [color, thickness]);

  // Initialize MediaPipe once scripts are loaded and elements are ready
  useEffect(() => {
    if (!scriptsLoaded || !videoRef.current || !drawingCanvasRef.current || !cursorCanvasRef.current) {
      return;
    }

    const SpeechRecognitionWindow = window as any;
    const HandsClass = SpeechRecognitionWindow.Hands;
    const CameraClass = SpeechRecognitionWindow.Camera;

    if (!HandsClass || !CameraClass) {
      setTimeout(() => setStatus('Dependency Init Error'), 0);
      return;
    }

    // Resize canvases initially
    resizeCanvases();

    const hands = new HandsClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);
    handsInstanceRef.current = hands;

    const videoElement = videoRef.current;
    const camera = new CameraClass(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });

    camera.start()
      .then(() => {
        setStatus('Show Hand to Start');
      })
      .catch((err: any) => {
        setStatus('Camera Access Denied');
        console.error(err);
      });

    cameraInstanceRef.current = camera;
  }, [scriptsLoaded, onResults, resizeCanvases]);

  const clearCanvas = () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const drawingCtx = drawingCanvas.getContext('2d');
      if (drawingCtx) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }
    }
    lastXRef.current = null;
    lastYRef.current = null;
  };

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme ad-page">
        {/* Background Decorative Grid */}
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">AIR_DRAW</div>

        {/* Video stream container - absolutely positioned in bg */}
        <div className="ad-video-container">
          <video
            ref={videoRef}
            className="ad-webcam-feed"
            autoPlay
            playsInline
            muted
          />
          <div className="ad-canvas-container">
            <canvas ref={drawingCanvasRef} className="ad-drawing-canvas" />
            <canvas ref={cursorCanvasRef} className="ad-cursor-canvas" />
          </div>
        </div>

        {/* Cyberpunk Floating UI Control Panel */}
        <div className="ad-ui-panel" style={{ '--app-color': color } as React.CSSProperties}>
          <header className="ad-ui-header">
            <span className="ad-ui-kicker">GESTURE // AIR_INTERFACES</span>
            <div className={`ad-ui-status ${status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
              <span className="ad-status-dot"></span>
              {status.toUpperCase()}
            </div>
          </header>

          <div className="ad-control-group">
            <label htmlFor="ad-colorPicker">NEON_COLOR</label>
            <div className="ad-color-wrapper">
              <input
                type="color"
                id="ad-colorPicker"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="ad-color-preview" style={{ background: color, boxShadow: `0 0 10px ${color}` }}></span>
            </div>
          </div>

          <div className="ad-control-group">
            <div className="ad-label-row">
              <label htmlFor="ad-thickness">BRUSH_SIZE</label>
              <span className="ad-value-display">{thickness}PX</span>
            </div>
            <input
              type="range"
              id="ad-thickness"
              min="2"
              max="20"
              value={thickness}
              onChange={(e) => setThickness(parseInt(e.target.value))}
            />
          </div>

          <button className="ad-clear-btn" onClick={clearCanvas}>
            CLEAR_CANVAS
          </button>

          <div className="ad-gesture-guide">
            <h3>GESTURE_SCHEMATICS</h3>
            <ul>
              <li>
                <span className="ad-icon">☝️</span>
                <span className="ad-text">1 Finger = DRAW_FLOW</span>
              </li>
              <li>
                <span className="ad-icon">✊</span>
                <span className="ad-text">Fist = PAUSE_NAVIGATION</span>
              </li>
              <li>
                <span className="ad-icon">🖐️</span>
                <span className="ad-text">Open Palm = ERASE_ALL</span>
              </li>
            </ul>
          </div>

          <footer className="ad-panel-footer">
            <button className="ad-back-btn" onClick={() => navigate('/portal')}>
              [RETURN_TO_PORTAL]
            </button>
          </footer>
        </div>

        <LegalFooter />
      </div>
    </>
  );
};

export default AirDraw;
