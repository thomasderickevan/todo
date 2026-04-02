import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomeShowcase.css';

const logoE = '/endeavor-e.png';

const apps = [
  {
    path: '/todo',
    id: 'taskmaster',
    title: 'TaskMaster',
    kicker: 'MOMENTUM & CLARITY',
    desc: 'Organize your life, one task at a time. Fast task planning with a clean workflow and synced momentum.',
    color: '#00FF41',
    mockup: (
      <div className="mock-video mock-taskmaster">
        <div className="mock-task-header"></div>
        <div className="mock-task mock-task-1"></div>
        <div className="mock-task mock-task-2"></div>
        <div className="mock-task mock-task-3"></div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="task-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FF41" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00FF41" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x="40" y="40" width="320" height="320" stroke="#00FF41" strokeWidth="1" opacity="0.2" />
        <path d="M80 120H320M80 200H320M80 280H200" stroke="#00FF41" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
        <path d="M100 150L150 200L250 100" stroke="url(#task-grad)" strokeWidth="24" strokeLinecap="square" strokeLinejoin="miter">
          <animate attributeName="stroke-dasharray" from="0, 1000" to="1000, 0" dur="3s" repeatCount="indefinite" />
        </path>
        <circle cx="200" cy="200" r="180" stroke="#00FF41" strokeWidth="0.5" opacity="0.1" />
        <rect x="300" y="300" width="40" height="40" stroke="#00FF41" strokeWidth="1" />
      </svg>
    )
  },
  {
    path: '/voicenotes',
    id: 'voicenotes',
    title: 'VoiceNotes',
    kicker: 'SPEAK FIRST, REFINE LATER',
    desc: 'Capture ideas out loud and turn them into usable notes. Instant transcription designed for a frictionless creative flow.',
    color: '#00E5FF',
    mockup: (
      <div className="mock-video mock-voicenotes">
        <div className="waveform-container">
          <div className="wave bar-1"></div>
          <div className="wave bar-2"></div>
          <div className="wave bar-3"></div>
          <div className="wave bar-4"></div>
          <div className="wave bar-5"></div>
        </div>
        <div className="mock-mic"></div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 200Q125 50 200 200T350 200" stroke="#00E5FF" strokeWidth="4" />
        <path d="M50 200Q125 100 200 200T350 200" stroke="#00E5FF" strokeWidth="2" opacity="0.5" />
        <path d="M50 200Q125 150 200 200T350 200" stroke="#00E5FF" strokeWidth="1" opacity="0.3" />
        <circle cx="200" cy="200" r="100" stroke="#00E5FF" strokeWidth="1" strokeDasharray="5 5" />
      </svg>
    )
  },
  {
    path: '/password',
    id: 'shieldgen',
    title: 'Shield Gen',
    kicker: 'IRONCLAD SECURITY',
    desc: 'Generate passwords, manage credentials, and secure sign-ins. Military-grade encryption wrapped in an elegant extension.',
    color: '#FF003C',
    mockup: (
      <div className="mock-video mock-shieldgen">
        <div className="shield-icon"></div>
        <div className="shield-scan-line"></div>
        <div className="password-dots">
          <span>*</span><span>*</span><span>*</span><span>*</span><span>*</span><span>*</span><span>*</span><span>*</span>
        </div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M200 50L350 100V200C350 300 200 350 200 350C200 350 50 300 50 200V100L200 50Z" stroke="#FF003C" strokeWidth="4" />
        <rect x="150" y="150" width="100" height="100" stroke="#FF003C" strokeWidth="2" transform="rotate(45 200 200)" />
        <circle cx="200" cy="200" r="10" fill="#FF003C" />
      </svg>
    )
  },
  {
    path: '/timer',
    id: 'appletimer',
    title: 'Apple Timer',
    kicker: 'DEEP WORK RHYTHM',
    desc: 'A focused timer flow for deep work and repeatable rhythm. Cut out the noise and reclaim your attention.',
    color: '#FFEA00',
    mockup: (
      <div className="mock-video mock-timer">
        <div className="timer-ring"></div>
        <div className="timer-hand"></div>
        <div className="timer-display">25:00</div>
      </div>
    ),
    poster: (
      <svg className="mc-poster" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="200" r="150" stroke="#FFEA00" strokeWidth="2" />
        <line x1="200" y1="200" x2="200" y2="80" stroke="#FFEA00" strokeWidth="8" strokeLinecap="round" />
        <line x1="200" y1="200" x2="300" y2="200" stroke="#FFEA00" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="198" y="60" width="4" height="20" fill="#FFEA00" transform={`rotate(${i * 30} 200 200)`} />
        ))}
      </svg>
    )
  },
  {
    path: '/assistant',
    id: 'aiassistant',
    title: 'AI Assistant',
    kicker: 'CONTEXT-AWARE HELP',
    desc: 'Context-aware help embedded directly into your workflow. Ask questions, generate content, and let AI do the heavy lifting.',
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
            <p>» INITIALIZING_MODULAR_STACK: [TASKMASTER, VOICENOTES, SHIELDGEN, TIMER, AI]</p>
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
