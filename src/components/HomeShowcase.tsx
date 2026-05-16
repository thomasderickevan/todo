import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomeShowcase.css';

const logoE = '/endeavor-e.png';

const apps = [
  {
    id: 'todo',
    title: 'TaskMaster',
    path: '/todo',
    kicker: 'MOMENTUM // TASK_MANAGEMENT',
    desc: 'High-performance task tracking designed for deep focus. Zero friction, total clarity.',
    color: '#00FF41',
    mockup: (
      <div className="mock-todo">
        <div className="mock-task"><span>[ ]</span> INITIALIZE_CORE_V2</div>
        <div className="mock-task"><span>[ ]</span> OPTIMIZE_LATENCY_FLIGHT</div>
        <div className="mock-task checked"><span>[x]</span> DEPLOY_MOMENTUM_DRIVE</div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="300" height="300" stroke="#00FF41" strokeWidth="2" />
        <path d="M100 200L170 270L300 130" stroke="#00FF41" strokeWidth="8" />
        <line x1="50" y1="100" x2="350" y2="100" stroke="#00FF41" strokeWidth="1" opacity="0.3" />
      </svg>
    )
  },
  {
    id: 'voicenotes',
    title: 'VoiceNotes',
    path: '/voicenotes',
    kicker: 'CAPTURE // AUDIO_INTELLIGENCE',
    desc: 'Instantly transcribe and analyze your thoughts. Capture lightning before it fades.',
    color: '#00E5FF',
    mockup: (
      <div className="mock-audio">
        <div className="audio-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div className="audio-transcript">"Optimize the momentum drive..."</div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="200" r="100" stroke="#00E5FF" strokeWidth="2" />
        <circle cx="200" cy="200" r="130" stroke="#00E5FF" strokeWidth="1" opacity="0.3" />
        <path d="M150 200C150 170 170 150 200 150C230 150 250 170 250 200" stroke="#00E5FF" strokeWidth="4" />
      </svg>
    )
  },
  {
    id: 'airdraw',
    title: 'Air Draw',
    path: '/airdraw',
    kicker: 'CREATIVE // NEON_FINGER_PAINTER',
    desc: 'Express ideas in the air with hand tracking technology. Paint with neon energy.',
    color: '#39ff14',
    mockup: (
      <div className="mock-airdraw">
        <div className="airdraw-hand">☝️</div>
        <div className="airdraw-neon-path"></div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 300C150 100 250 350 300 100" stroke="#39ff14" strokeWidth="4" strokeLinecap="round" />
        <circle cx="300" cy="100" r="10" fill="#39ff14" />
        <circle cx="300" cy="100" r="20" stroke="#39ff14" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  },
  {
    id: 'password',
    title: 'ShieldGen',
    path: '/password',
    kicker: 'SECURITY // ENTROPY_CONTROL',
    desc: 'Unbreakable cryptographic keys generated instantly. Your perimeter is our priority.',
    color: '#FF003C',
    mockup: (
      <div className="mock-password">
        <div className="pass-box">********</div>
        <div className="pass-entropy">ENTROPY: 128-BIT</div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M200 80L320 130V220C320 280 270 330 200 350C130 330 80 280 80 220V130L200 80Z" stroke="#FF003C" strokeWidth="2" />
        <circle cx="200" cy="200" r="40" stroke="#FF003C" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  },
  {
    id: 'timer',
    title: 'AppleTimer',
    path: '/timer',
    kicker: 'FOCUS // TEMPORAL_ALIGNMENT',
    desc: 'Master your internal clock. Engineered periods of deep work and necessary restoration.',
    color: '#FFEA00',
    mockup: (
      <div className="mock-timer">
        <div className="timer-ring">25:00</div>
        <div className="timer-label">FLOW_STATE</div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="200" r="120" stroke="#FFEA00" strokeWidth="2" />
        <path d="M200 100V200L270 270" stroke="#FFEA00" strokeWidth="4" strokeLinecap="round" />
        <circle cx="200" cy="200" r="5" fill="#FFEA00" />
      </svg>
    )
  },
  {
    id: 'assistant',
    title: 'AI_Assistant',
    path: '/assistant',
    kicker: 'INTELLIGENCE // CONTEXT_AWARE',
    desc: 'A brutalist approach to AI. Ask questions, generate content, and let AI do the heavy lifting.',
    color: '#FF00FF',
    mockup: (
      <div className="mock-video mock-ai">
        <div className="ai-cursor"></div>
        <div className="ai-text-block">
          <span className="typewriter">Generating response...</span>
        </div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M200 50L220 180L350 200L220 220L200 350L180 220L50 200L180 180L200 50Z" fill="none" stroke="#FF00FF" strokeWidth="2" />
        <circle cx="200" cy="200" r="120" stroke="#FF00FF" strokeWidth="1" opacity="0.3" strokeDasharray="10 5" />
        <path d="M150 150L250 250M250 150L150 250" stroke="#FF00FF" strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }
];

const principles = [
  { title: 'ZERO_FRICTION', desc: 'Every millisecond of latency is a barrier to momentum. We optimize for the first 5 seconds of use.' },
  { title: 'CRITICAL_ONLY', desc: 'No fluff. No "just-in-case" features. Only the tools that actually move the needle.' },
  { title: 'BRUTALIST_ELEGANCE', desc: 'Aesthetics that respect your intelligence. High contrast, sharp edges, pure function.' },
  { title: 'MODULAR_FLOW', desc: 'Apps that work together but stay out of each other\'s way. Build your own stack.' }
];

const HomeShowcase: React.FC = () => {
  const navigate = useNavigate();
  const observerRefs = useRef<(HTMLElement | null)[]>([]);
  const [scrollProgress, setScrollProgress] = React.useState(0);

  useEffect(() => {
    document.title = 'ENDEAVOR // OS';

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.pageYOffset / totalScroll) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.15 });

    observerRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="home-showcase modern-critical">
      
      {/* Visual Layer: Background Texture & Noise */}
      <div className="mc-bg-overlay">
        <div className="mc-dot-grid"></div>
        <div className="mc-scanlines"></div>
        <div className="mc-noise"></div>
      </div>

      {/* Floating Tech Bits (Decorative) */}
      <div className="mc-floating-bits">
        <div className="bit bit-1">0101</div>
        <div className="bit bit-2">CORE_ACTIVE</div>
        <div className="bit bit-3">MOMENTUM_STABLE</div>
        <div className="bit bit-4">SYS_V2.0.4</div>
        <div className="bit bit-5">77.4%_LOAD</div>
      </div>

      {/* Reading Progress Bar */}
      <div className="mc-progress-bar" style={{ width: `${scrollProgress}%` }}></div>
      
      {/* Navigation */}
      <nav className="mc-nav">
        <div className="mc-brand">
          <img src={logoE} alt="e" className="mc-logo" />
          <span className="mc-brand-text">ENDEAVOR_</span>
        </div>
        <div className="mc-nav-links">
          <Link to="/privacy">PRIVACY</Link>
          <Link to="/terms">TERMS</Link>
          <button className="mc-cta-btn" onClick={() => navigate('/portal')}>SYSTEM_PORTAL</button>
        </div>
      </nav>

      {/* Large Background Deco Text */}
      <div className="mc-bg-deco-text">SYSTEM_ACTIVE</div>

      {/* Hero Section */}
      <header className="mc-hero">
        <div className="mc-hero-content">
          <h1 className="mc-title">
            <span className="glitch-text" data-text="CRITICAL">CRITICAL</span><br/>
            TOOLS FOR<br/>
            FANTASTIC<br/>
            WORK
          </h1>
          <p className="mc-subtitle">
            A brutalist, high-performance suite of modular applications designed to eliminate friction and amplify output. No noise. Just momentum.
          </p>
          <button className="mc-explore-btn" onClick={() => {
            document.getElementById('showcase-start')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            INITIALIZE [↓]
          </button>
        </div>
        <div className="mc-hero-graphics">
          <div className="mc-wireframe-globe">
            <div className="mc-orbit mc-orbit-1"></div>
            <div className="mc-orbit mc-orbit-2"></div>
            <div className="mc-orbit mc-orbit-3"></div>
            {/* Added Hero Poster Image */}
            <svg className="mc-hero-poster" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 10H90V90H10V10Z" stroke="white" strokeWidth="0.5" opacity="0.2" />
              <path d="M50 20V80M20 50H80" stroke="white" strokeWidth="0.5" opacity="0.2" />
              <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="0.5" opacity="0.1" />
            </svg>
          </div>
        </div>
      </header>

      {/* Billboard Gallery (The "Images" Section) */}
      <section className="mc-billboard-gallery">
        <div className="mc-section-header">
          <span className="mc-app-kicker">GALLERY // VISUAL_SYSTEM</span>
          <h2 className="mc-section-title">AESTHETIC_FOUNDATIONS</h2>
        </div>
        <div className="mc-billboard-grid">
          {apps.map((app) => (
            <div key={`poster-${app.id}`} className="mc-billboard-item" style={{ '--app-color': app.color } as React.CSSProperties}>
              <div className="mc-billboard-poster">
                {app.poster}
              </div>
              <div className="mc-billboard-overlay">
                <span className="mc-poster-id">APP_{app.id.toUpperCase()}</span>
                <span className="mc-poster-title">{app.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* App Showcases */}
      <main className="mc-main" id="showcase-start">
        {apps.map((app, index) => (
          <section 
            key={app.id} 
            className={`mc-app-section ${index % 2 === 1 ? 'mc-reverse' : ''}`}
            ref={el => { observerRefs.current[index] = el; }}
            style={{ '--app-color': app.color } as React.CSSProperties}
          >
            <div className="mc-app-info">
              <span className="mc-app-kicker">{app.kicker}</span>
              <h2 className="mc-app-title">{app.title}</h2>
              <p className="mc-app-desc">{app.desc}</p>
              <button 
                className="mc-app-launch"
                onClick={() => navigate(app.path)}
                style={{ borderColor: app.color, color: app.color }}
              >
                LAUNCH {app.title.toUpperCase()}
              </button>
            </div>
            
            <div className="mc-app-visual">
              <div className="mc-mockup-frame" style={{ boxShadow: `0 0 40px ${app.color}22` }}>
                <div className="mc-mockup-topbar">
                  <span className="mc-dot"></span>
                  <span className="mc-dot"></span>
                  <span className="mc-dot"></span>
                </div>
                {app.mockup}
              </div>
              {/* Ghost Poster in background of section */}
              <div className="mc-app-ghost-poster">
                {app.poster}
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* Decorative Status Bar / Activity Feed to fill "Empty" space */}
      <section className="mc-system-status">
        <div className="mc-status-panel">
          <div className="mc-status-header">
            <span className="mc-dot"></span>
            <span>SYSTEM_MONITOR</span>
          </div>
          <div className="mc-status-feed">
            <p>» BOOTING_ENDEAVOR_OS_V2.0.4...</p>
            <p>» INITIALIZING_MODULAR_STACK: [TASKMASTER, VOICENOTES, AIRDRAW, SHIELDGEN, TIMER, AI]</p>
            <p>» SYSTEM_STATUS: [OPTIMAL]</p>
            <p>» LATENCY: [0.04ms]</p>
            <p>» UPTIME: [99.99%]</p>
            <p className="typing-cursor">» LISTENING_FOR_MOMENTUM_</p>
          </div>
        </div>
      </section>

      {/* Core Principles Section */}
      <section className="mc-principles-section">
        <div className="mc-section-header">
          <span className="mc-app-kicker">ETHOS // DESIGN_PHILOSOPHY</span>
          <h2 className="mc-section-title">BUILT_FOR_PERFORMANCE</h2>
        </div>
        <div className="mc-principles-grid">
          {principles.map((p) => (
            <div key={p.title} className="mc-principle-card">
              <h3 className="mc-principle-title">{p.title}</h3>
              <p className="mc-principle-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="mc-final-cta">
        <div className="mc-cta-box">
          <h2>READY_TO_START_?</h2>
          <p>Access the full suite through the System Portal.</p>
          <button className="mc-big-cta" onClick={() => navigate('/portal')}>
            LAUNCH_PORTAL_NOW
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mc-footer">
        <div className="mc-footer-grid">
          <div className="mc-footer-brand">
            <img src={logoE} alt="e" />
            <p>ENDEAVOR // SYSTEM ACTIVE</p>
          </div>
          <div className="mc-footer-links">
            <Link to="/portal">PORTAL</Link>
            <Link to="/privacy">PRIVACY</Link>
            <Link to="/terms">TERMS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeShowcase;
