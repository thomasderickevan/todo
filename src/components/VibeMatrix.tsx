/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './VibeMatrix.css';
type Tier = "DORMANT" | "ACTIVE" | "SUPERNOVA";

interface TierConfig {
  colors: string[];
  orbitSpeedMultiplier: number;
  vxVyMultiplier: number;
  sizeMultiplier: number;
  sizeBase: number;
  connectionAlpha: number;
  connectionLineWidth: number;
  appColor: string;
  showTrails: boolean;
  showOrbitCenter: boolean;
  useVortexPhysics: boolean;
  hasShadow: boolean;
}

const TIER_CONFIGS: Record<Tier, TierConfig> = {
  DORMANT: {
    colors: ["#00ffcc", "#00e5ff", "#388E3C"],
    orbitSpeedMultiplier: 1,
    vxVyMultiplier: 0.6,
    sizeMultiplier: 5,
    sizeBase: 1,
    connectionAlpha: 0.22,
    connectionLineWidth: 0.8,
    appColor: "#00FFCC",
    showTrails: false,
    showOrbitCenter: false,
    useVortexPhysics: false,
    hasShadow: false,
  },
  ACTIVE: {
    colors: ["#FFEA00", "#00FF41", "#81C784"],
    orbitSpeedMultiplier: 1,
    vxVyMultiplier: 1.5,
    sizeMultiplier: 3.5,
    sizeBase: 1,
    connectionAlpha: 0.22,
    connectionLineWidth: 0.8,
    appColor: "#FFEA00",
    showTrails: false,
    showOrbitCenter: false,
    useVortexPhysics: false,
    hasShadow: true,
  },
  SUPERNOVA: {
    colors: ["#FF003C", "#FF00FF", "#FFEA00", "#00E5FF"],
    orbitSpeedMultiplier: 2.5,
    vxVyMultiplier: 4,
    sizeMultiplier: 4,
    sizeBase: 1,
    connectionAlpha: 0.35,
    connectionLineWidth: 1.2,
    appColor: "#FF003C",
    showTrails: true,
    showOrbitCenter: true,
    useVortexPhysics: true,
    hasShadow: true,
  },
};


interface MomentumMetrics {
  completedTasks: number;
  timerSessions: number;
  voiceNotes: number;
  passwords: number;
  score: number;
  tier: 'DORMANT' | 'ACTIVE' | 'SUPERNOVA';
}

const VibeMatrix: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Interactive settings & metrics
  const [metrics, setMetrics] = useState<MomentumMetrics>({
    completedTasks: 0,
    timerSessions: 0,
    voiceNotes: 0,
    passwords: 0,
    score: 0,
    tier: 'DORMANT'
  });

  const [overrideTier, setOverrideTier] = useState<string>('auto'); // auto, DORMANT, ACTIVE, SUPERNOVA
  const [particleCount, setParticleCount] = useState<number>(80);
  const [connectionDistance, setConnectionDistance] = useState<number>(100);
  const [gravityPull, setGravityPull] = useState<number>(1.2);
  const [showVectorGrid, setShowVectorGrid] = useState<boolean>(true);

  // Mouse interaction refs
  const mouseRef = useRef<{ x: number | null; y: number | null; isPressed: boolean }>({
    x: null,
    y: null,
    isPressed: false
  });

  const animationFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);

  // 1. Gather local storage metrics to calculate energy score
  const getProductivityMetrics = useCallback((): MomentumMetrics => {
    try {
      // Completed Tasks
      const savedTasksStr = localStorage.getItem('local_tasks');
      const tasks = savedTasksStr ? JSON.parse(savedTasksStr) : [];
      const completedTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.completed).length : 0;

      // Timer Sessions
      const timerSessions = Number(localStorage.getItem('at_sessions')) || 0;

      // Voice notes
      const savedNotesStr = localStorage.getItem('local_voice_notes');
      const voiceNotes = savedNotesStr ? JSON.parse(savedNotesStr).length : 0;

      // Shield Passwords
      let passwords = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('local_vault_passwords')) {
          try {
            const vault = JSON.parse(localStorage.getItem(key) || '[]');
            passwords += vault.length;
          } catch {
            // Ignored
          }
        }
      }

      // Energy Score Formula
      const score = completedTasks + (timerSessions * 2) + voiceNotes + passwords;

      let tier: 'DORMANT' | 'ACTIVE' | 'SUPERNOVA' = 'DORMANT';
      if (score >= 7) {
        tier = 'SUPERNOVA';
      } else if (score >= 3) {
        tier = 'ACTIVE';
      }

      return { completedTasks, timerSessions, voiceNotes, passwords, score, tier };
    } catch (e) {
      console.warn("Failed to calculate momentum stats:", e);
      return { completedTasks: 0, timerSessions: 0, voiceNotes: 0, passwords: 0, score: 0, tier: 'DORMANT' };
    }
  }, []);

  // Update metrics on load
  useEffect(() => {
    document.title = '✦ endeavor • Vibe Matrix';
    setTimeout(() => {
      setMetrics(getProductivityMetrics());
    }, 0);
    return () => {
      document.title = 'Portal • endeavor';
    };
  }, [getProductivityMetrics]);

  // Handle Resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Particle Class Setup and Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const activeTier: Tier = (overrideTier === 'auto' ? metrics.tier : overrideTier) as Tier;
    const config = TIER_CONFIGS[activeTier];

    // Initialize particles array based on count
    const initParticles = () => {
      const arr = [];
      const colors = config.colors;

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const orbitRadius = 100 + Math.random() * 200;
        const orbitSpeed = (0.005 + Math.random() * 0.01) * config.orbitSpeedMultiplier;
        
        arr.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.vxVyMultiplier,
          vy: (Math.random() - 0.5) * config.vxVyMultiplier,
          size: Math.random() * config.sizeMultiplier + config.sizeBase,
          color: colors[Math.floor(Math.random() * colors.length)],
          angle,
          orbitRadius,
          orbitSpeed,
          baseSize: 0
        });
      }
      particlesRef.current = arr;
    };

    initParticles();

    // Physics Animation loop
    const animate = () => {
      // If SUPERNOVA, paint translucent background to leave gorgeous glowing trails
      if (config.showTrails) {
        ctx.fillStyle = "rgba(13, 13, 13, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      const particles = particlesRef.current;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const isPressed = mouseRef.current.isPressed;

      // Draw Orbit Center in active modes
      if (config.showOrbitCenter) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 100);
        grad.addColorStop(0, "rgba(255, 0, 60, 0.15)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Update and Draw Particles
      particles.forEach((p) => {
        // Mode Physics
        if (config.useVortexPhysics) {
          // Circular vortex gravity well in center of screen
          p.angle += p.orbitSpeed;
          const targetX = canvas.width / 2 + Math.cos(p.angle) * p.orbitRadius;
          const targetY = canvas.height / 2 + Math.sin(p.angle) * p.orbitRadius;
          
          p.x += (targetX - p.x) * 0.04 + p.vx;
          p.y += (targetY - p.y) * 0.04 + p.vy;
        } else {
          // Default linear drift
          p.x += p.vx;
          p.y += p.vy;

          // Boundary bounce
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }

        // Mouse Gravity Pull
        if (mouseX !== null && mouseY !== null) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 220) {
            const force = (220 - dist) / 220;
            // Attract or repel depending on mouse state
            const multiplier = isPressed ? -gravityPull * 2.5 : gravityPull;
            p.x += (dx / dist) * force * multiplier;
            p.y += (dy / dist) * force * multiplier;
          }
        }

        // Render Particle point
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        if (config.hasShadow) {
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });

      // Reset shadows for vectors
      ctx.shadowBlur = 0;

      // Draw Vector Connecting Lines (Neural momentum network)
      if (showVectorGrid && activeTier !== 'DORMANT') {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance) {
              const alpha = (connectionDistance - dist) / connectionDistance * config.connectionAlpha;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              
              // Gradient connecting line
              const lineGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
              lineGrad.addColorStop(0, p1.color);
              lineGrad.addColorStop(1, p2.color);
              ctx.strokeStyle = lineGrad;
              ctx.globalAlpha = alpha;
              ctx.lineWidth = config.connectionLineWidth;
              ctx.stroke();
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [overrideTier, metrics.tier, particleCount, connectionDistance, gravityPull, showVectorGrid]);

  // Mouse move captures coordinates
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }
  };

  const handleMouseLeave = () => {
    mouseRef.current.x = null;
    mouseRef.current.y = null;
    mouseRef.current.isPressed = false;
  };

  const handleMouseDown = () => {
    mouseRef.current.isPressed = true;
  };

  const handleMouseUp = () => {
    mouseRef.current.isPressed = false;
  };

  const activeTier: Tier = (overrideTier === 'auto' ? metrics.tier : overrideTier) as Tier;
  const currentConfig = TIER_CONFIGS[activeTier];

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme vm-page" ref={containerRef}>
        
        {/* Background visual layering */}
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">MOMENTUM</div>

        {/* Generative Interactive Canvas */}
        <canvas
          ref={canvasRef}
          className="vm-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />

        {/* Cyber floating control panels */}
        <div className="vm-layout-container">
          
          {/* Panel 1: Stats & Momentum levels */}
          <div className="vm-card vm-stats-card" style={{ '--app-color': currentConfig.appColor } as React.CSSProperties}>
            <header className="vm-card-header">
              <span className="vm-kicker">MOMENTUM_ENGINE // V2.0.4</span>
              <h1 className="vm-title">VIBE MATRIX</h1>
            </header>

            <div className="vm-energy-tier-indicator">
              <div className="vm-tier-label">MOMENTUM_LEVEL</div>
              <div className={`vm-tier-value ${activeTier?.toLowerCase()}`}>
                {activeTier}
              </div>
            </div>

            <div className="vm-metrics-breakdown">
              <h3>SYSTEM_METRIC_SCHEMATICS</h3>
              <div className="vm-metric-row">
                <span>✅ COMPLETED_TASKS</span>
                <span className="vm-metric-val">+{metrics.completedTasks}</span>
              </div>
              <div className="vm-metric-row">
                <span>🍏 DEEP_WORK_SESSIONS</span>
                <span className="vm-metric-val">+{metrics.timerSessions * 2} ({metrics.timerSessions}x2)</span>
              </div>
              <div className="vm-metric-row">
                <span>🎙️ VOICE_NOTES_CAPTURED</span>
                <span className="vm-metric-val">+{metrics.voiceNotes}</span>
              </div>
              <div className="vm-metric-row">
                <span>🔐 SHIELD_CREDENTIALS</span>
                <span className="vm-metric-val">+{metrics.passwords}</span>
              </div>
              <div className="vm-score-divider"></div>
              <div className="vm-metric-row vm-total-score">
                <span>🌌 TOTAL_ENERGY_SCORE</span>
                <span className="vm-metric-val">{metrics.score}</span>
              </div>
            </div>

            <div className="vm-interactive-tip">
              <strong>INTERACTIVE:</strong> Move cursor inside the void to create a gravity attractor. Hold click to trigger gravitational repulsion.
            </div>
          </div>

          {/* Panel 2: Aesthetic sandbox settings */}
          <div className="vm-card vm-settings-card">
            <header className="vm-card-header">
              <span className="vm-kicker">MATRIX_TUNING // CONTROL</span>
              <h2 className="vm-subtitle">VECTOR SANDBOX</h2>
            </header>

            <div className="vm-settings-form">
              <div className="vm-control-group">
                <label>AESTHETIC_TIER_OVERRIDE</label>
                <select 
                  className="vm-select" 
                  value={overrideTier} 
                  onChange={(e) => setOverrideTier(e.target.value)}
                >
                  <option value="auto">AUTO_PRODUCTIVITY ({metrics.tier})</option>
                  <option value="DORMANT">DORMANT (COLD_STARDUST)</option>
                  <option value="ACTIVE">ACTIVE (MOMENTUM_FLOW)</option>
                  <option value="SUPERNOVA">SUPERNOVA (ORBITAL_VORTEX)</option>
                </select>
              </div>

              <div className="vm-control-group">
                <div className="vm-label-row">
                  <label>PARTICLE_QUANTITY</label>
                  <span>{particleCount}</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="150" 
                  value={particleCount} 
                  onChange={(e) => setParticleCount(parseInt(e.target.value))}
                />
              </div>

              <div className="vm-control-group">
                <div className="vm-label-row">
                  <label>VECTOR_LINK_RANGE</label>
                  <span>{connectionDistance}PX</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="200" 
                  value={connectionDistance} 
                  onChange={(e) => setConnectionDistance(parseInt(e.target.value))}
                />
              </div>

              <div className="vm-control-group">
                <div className="vm-label-row">
                  <label>GRAVITATIONAL_PULL</label>
                  <span>{gravityPull.toFixed(1)}G</span>
                </div>
                <input 
                  type="range" 
                  min="0.2" 
                  max="3.0" 
                  step="0.1" 
                  value={gravityPull} 
                  onChange={(e) => setGravityPull(parseFloat(e.target.value))}
                />
              </div>

              <div className="vm-control-group checkbox-row">
                <label className="vm-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={showVectorGrid} 
                    onChange={() => setShowVectorGrid(!showVectorGrid)}
                  />
                  <span className="vm-custom-check"></span>
                  SHOW_VECTOR_LINKS
                </label>
              </div>
            </div>

            <footer className="vm-card-footer">
              <button className="vm-back-btn" onClick={() => navigate('/portal')}>
                [RETURN_TO_PORTAL]
              </button>
            </footer>
          </div>

        </div>

        <LegalFooter />
      </div>
    </>
  );
};

export default VibeMatrix;
