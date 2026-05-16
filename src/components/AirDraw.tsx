import React, { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './AirDraw.css';

const PALETTE = [
  '#00f5ff', '#ff00aa', '#39ff14', '#ff6600',
  '#ffee00', '#cc44ff', '#ffffff', '#ff0040',
  '#00aaff', '#ff99cc', '#88ff00', '#ff5500',
];

const MODE_META = {
  draw: { dot: 'draw', text: 'DRAWING' },
  erase: { dot: 'erase', text: 'ERASING' },
  pause: { dot: 'pause', text: 'PAUSED' },
  idle: { dot: 'idle', text: 'READY' },
};

type Mode = 'draw' | 'erase' | 'pause' | 'idle';

const AirDraw: React.FC = () => {
  const [color, setColor] = useState('#00f5ff');
  const [brushSize, setBrushSize] = useState(6);
  const [glowSize, setGlowSize] = useState(20);
  const [glowOn, setGlowOn] = useState(true);
  const [mode, setModeState] = useState<Mode>('idle');
  const [loadingMsg, setLoadingMsg] = useState('NEON FINGER PAINTER');
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handsInstanceRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);

  const setMode = useCallback((m: Mode) => {
    setModeState(prev => {
      if (prev === m) return prev;
      if (m !== 'draw') {
        lastPos.current = null;
      }
      return m;
    });
  }, []);

  const drawPoint = useCallback((x: number, y: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = x * canvas.width;
    const cy = y * canvas.height;

    if (lastPos.current === null) {
      lastPos.current = { x: cx, y: cy };
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (glowOn) {
      ctx.shadowBlur = glowSize * 2;
      ctx.shadowColor = color;
    }

    // Core stroke
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Bright inner highlight
    if (glowOn) {
      ctx.shadowBlur = glowSize * 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = brushSize * 0.25;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    ctx.restore();
    lastPos.current = { x: cx, y: cy };
  }, [color, brushSize, glowSize, glowOn]);

  const eraseAt = useCallback((x: number, y: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = x * canvas.width;
    const cy = y * canvas.height;
    const r = brushSize * 6;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
  }, [brushSize]);

  const drawCursor = useCallback((x: number, y: number, modeStr: Mode) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = x * canvas.width;
    const cy = y * canvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (modeStr === 'pause') return;

    const r = modeStr === 'erase' ? brushSize * 6 : brushSize / 2 + 4;
    const col = modeStr === 'erase' ? '#ff4444'
      : modeStr === 'draw' ? color
      : '#888';

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    if (modeStr === 'draw') {
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#fff';
      ctx.fill();
    }
    ctx.restore();
  }, [brushSize, color]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResults = useCallback((results: any) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setMode('idle');
      lastPos.current = null;
      return;
    }

    const lm = results.multiHandLandmarks[0];
    // Mirror X because camera is mirrored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mirrorLm = lm.map((p: any) => ({ x: 1 - p.x, y: p.y, z: p.z }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isFingerUp = (landmarks: any[], tip: number, pip: number) => {
      return landmarks[tip].y < landmarks[pip].y;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detectGesture = (landmarks: any[]) => {
      const indexUp = isFingerUp(landmarks, 8, 6);
      const middleUp = isFingerUp(landmarks, 12, 10);
      const ringUp = isFingerUp(landmarks, 16, 14);
      const pinkyUp = isFingerUp(landmarks, 20, 18);

      const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

      if (!indexUp && !middleUp && !ringUp && !pinkyUp) return 'pause';
      if (extendedCount >= 3) return 'erase';
      if (indexUp && !middleUp) return 'draw';
      return 'pause';
    };

    const gesture = detectGesture(mirrorLm);
    setMode(gesture);

    const tip = mirrorLm[8]; // index fingertip

    if (gesture === 'draw') {
      drawPoint(tip.x, tip.y);
    } else if (gesture === 'erase') {
      eraseAt(tip.x, tip.y);
      lastPos.current = null;
    } else {
      lastPos.current = null;
    }

    drawCursor(tip.x, tip.y, gesture);
  }, [setMode, drawPoint, eraseAt, drawCursor]);

  useEffect(() => {
    // Dynamically load MediaPipe from CDN to avoid build/ESM issues
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleStart = async () => {
    setIsStarted(true);
    setShowSpinner(true);
    setError(null);

    try {
      setLoadingMsg('REQUESTING CAMERA…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) return reject();
          videoRef.current.onloadedmetadata = () => resolve();
          videoRef.current.onerror = reject;
          setTimeout(() => reject(new Error('Video load timeout')), 8000);
        });
        await videoRef.current.play();
      }

      setLoadingMsg('LOADING HAND MODEL…');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Hands = (window as any).Hands;
      if (!Hands) {
        throw new Error('Hands model not loaded from CDN yet');
      }

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.72,
        minTrackingConfidence: 0.6,
      });

      hands.onResults(onResults);
      handsInstanceRef.current = hands;

      setLoadingMsg('WARMING UP MODEL…');
      if (videoRef.current) {
        await hands.send({ image: videoRef.current });
      }

      setLoadingMsg('READY!');
      setIsLoading(false);
      setMode('idle');

      const tick = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2 && handsInstanceRef.current) {
          await handsInstanceRef.current.send({ image: videoRef.current });
        }
        requestRef.current = requestAnimationFrame(tick);
      };
      requestRef.current = requestAnimationFrame(tick);

    } catch (err: any) {
      console.error(err);
      setError(`Initialization failed: ${err.message || err}. Please reload and try again.`);
      setIsStarted(false);
      setShowSpinner(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = drawCanvasRef.current;
      const overlay = overlayCanvasRef.current;
      if (!canvas || !overlay) return;

      const container = canvas.parentElement;
      if (!container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;

      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const tmpCtx = tmp.getContext('2d');
      if (tmpCtx) tmpCtx.drawImage(canvas, 0, 0);

      canvas.width = overlay.width = w;
      canvas.height = overlay.height = h;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, w, h);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsInstanceRef.current) handsInstanceRef.current.close();
    };
  }, []);

  const handleClear = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPos.current = null;
  };

  const handleSave = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const composite = document.createElement('canvas');
    composite.width = canvas.width;
    composite.height = canvas.height;
    const ctx = composite.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, composite.width, composite.height);
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.href = composite.toDataURL('image/png');
    a.download = 'airdraw-' + Date.now() + '.png';
    a.click();
  };

  // PiP Drag Logic
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePipMouseDown = (e: React.MouseEvent) => {
    if (!pipRef.current) return;
    dragging.current = true;
    const r = pipRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !pipRef.current) return;
      const container = pipRef.current.parentElement?.getBoundingClientRect();
      if (!container) return;

      let nx = e.clientX - container.left - dragOffset.current.x;
      let ny = e.clientY - container.top - dragOffset.current.y;

      nx = Math.max(0, Math.min(nx, container.width - pipRef.current.offsetWidth));
      ny = Math.max(0, Math.min(ny, container.height - pipRef.current.offsetHeight));

      setPipPos({ x: nx, y: ny });
    };

    const handleMouseUp = () => {
      dragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const meta = MODE_META[mode] || MODE_META.idle;

  return (
    <>
      <Navbar />
      <div className="airdraw-body">
        <header className="airdraw-header">
          <div className="airdraw-logo">✦ AIR DRAW</div>
          <div className="airdraw-status-pill">
            <div className={`airdraw-status-dot ${meta.dot}`}></div>
            <span>{meta.text}</span>
          </div>
          <div className="airdraw-mediapipe-label">MEDIAPIPE · HANDS</div>
        </header>

        <div className="airdraw-workspace">
          <div className="airdraw-canvas-container">
            <canvas ref={drawCanvasRef} id="drawCanvas"></canvas>
            <canvas ref={overlayCanvasRef} id="overlayCanvas"></canvas>

            <div
              ref={pipRef}
              id="pip-container"
              style={{
                left: `${pipPos.x}px`,
                top: `${pipPos.y}px`,
                bottom: 'auto',
                cursor: dragging.current ? 'grabbing' : 'grab'
              }}
              onMouseDown={handlePipMouseDown}
            >
              <video ref={videoRef} id="webcam" autoPlay playsInline muted></video>
              <div className="pip-label">CAM</div>
            </div>

            {isLoading && (
              <div id="loading">
                <div className="loading-title">AIR DRAW</div>
                {showSpinner && <div className="spinner"></div>}
                <div className="loading-sub">{loadingMsg}</div>
                {!isStarted && (
                  <button onClick={handleStart} className="start-btn">▶ GRANT CAMERA ACCESS</button>
                )}
                {error && (
                  <div className="error-box" style={{ display: 'block' }}>
                    {error}
                  </div>
                )}
                {error && (
                  <div id="retry-wrap" style={{ display: 'block' }}>
                    <button onClick={() => { setError(null); setIsStarted(false); setShowSpinner(false); }} className="retry-btn">
                      ↻ TRY AGAIN
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="airdraw-panel">
            <div className="airdraw-panel-section">
              <div className="airdraw-section-label">Color</div>
              <div className="airdraw-color-grid">
                {PALETTE.map(c => (
                  <div
                    key={c}
                    className={`airdraw-swatch ${c === color ? 'active' : ''}`}
                    style={{ background: c, boxShadow: `0 0 8px ${c}55` } as React.CSSProperties}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <div className="airdraw-color-row">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <span className="airdraw-color-hex">{color.toUpperCase()}</span>
              </div>
            </div>

            <div className="airdraw-panel-section">
              <div className="airdraw-section-label">Brush Size</div>
              <div className="airdraw-slider-wrap">
                <div className="airdraw-slider-header">
                  <span>THICKNESS</span>
                  <span className="airdraw-val">{brushSize}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ '--pct': `${((brushSize - 2) / 28 * 100).toFixed(0)}%` } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="airdraw-panel-section">
              <div className="airdraw-section-label">Glow</div>
              <div className="airdraw-slider-wrap" style={{ marginBottom: '12px' }}>
                <div className="airdraw-slider-header">
                  <span>INTENSITY</span>
                  <span className="airdraw-val">{glowSize}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="60"
                  value={glowSize}
                  onChange={(e) => setGlowSize(parseInt(e.target.value))}
                  style={{ '--pct': `${((glowSize - 4) / 56 * 100).toFixed(0)}%` } as React.CSSProperties}
                />
              </div>
              <div className="airdraw-toggle-row">
                <span>GLOW ON</span>
                <div
                  className={`airdraw-toggle ${glowOn ? 'on' : ''}`}
                  onClick={() => setGlowOn(!glowOn)}
                ></div>
              </div>
            </div>

            <div className="airdraw-panel-section">
              <div className="airdraw-section-label">Actions</div>
              <button className="airdraw-btn" onClick={handleClear}>⌫ CLEAR CANVAS</button>
              <button className="airdraw-btn" onClick={handleSave}>⬇ SAVE IMAGE</button>
            </div>

            <div className="airdraw-panel-section">
              <div className="airdraw-section-label">Gestures</div>
              <div className="airdraw-legend">
                <div className="airdraw-legend-item">
                  <span className="airdraw-legend-icon">☝️</span>
                  <span>Index finger up → <strong style={{ color: '#39ff14' }}>DRAW</strong></span>
                </div>
                <div className="airdraw-legend-item">
                  <span className="airdraw-legend-icon">🖐️</span>
                  <span>Open palm (4+ fingers) → <strong style={{ color: '#ff4444' }}>ERASE</strong></span>
                </div>
                <div className="airdraw-legend-item">
                  <span className="airdraw-legend-icon">✊</span>
                  <span>Closed fist → <strong style={{ color: '#ffaa00' }}>PAUSE</strong></span>
                </div>
              </div>
            </div>
          </aside>
        </div>
        <LegalFooter />
      </div>
    </>
  );
};

export default AirDraw;
