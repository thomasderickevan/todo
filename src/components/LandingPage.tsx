import React from 'react';
import './LandingPage.css';
import LegalFooter from './LegalFooter';

interface LandingPageProps {
  onLogin: () => void;
  onGuest: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onGuest }) => {
  return (
    <div className="landing-container">
      <div className="animation-container left-anim">
        <svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>
            {`
            .clipboard-group { animation: float 3s ease-in-out infinite; }
            .check-mark { transform: scale(0); transform-origin: 55px 55px; animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; animation-delay: 1.2s; }
            .task-line { stroke-dasharray: 40; stroke-dashoffset: 40; animation: slideIn 0.8s ease-out forwards; animation-delay: 0.5s; }
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            @keyframes bounceIn { to { transform: scale(1); } }
            @keyframes slideIn { to { stroke-dashoffset: 0; } }
            `}
          </style>
          <g className="clipboard-group">
            <rect x="25" y="20" width="50" height="60" rx="8" stroke="#374151" strokeWidth="4" />
            <rect x="40" y="15" width="20" height="10" rx="4" fill="#374151" />
            <line className="task-line" x1="35" y1="40" x2="65" y2="40" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
            <line className="task-line" x1="35" y1="55" x2="55" y2="55" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
            <line className="task-line" x1="35" y1="70" x2="60" y2="70" stroke="#E5E7EB" strokeWidth="4" strokeLinecap="round" />
            <circle className="check-mark" cx="65" cy="65" r="12" fill="#10B981" />
            <path className="check-mark" d="M59 65L63 69L71 61" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>

      <div className="landing-card">
        <div className="landing-header">
          <div className="logo-icon">✅</div>
          <h1>TaskMaster</h1>
          <p>Organize your life, one task at a time.</p>
        </div>
        
        <div className="landing-actions">
          <button className="google-signin-btn" onClick={onLogin}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22px" height="22px">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.91 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.02-10.36 7.02-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
          
          <div className="separator">
            <span>or</span>
          </div>
          
          <button className="guest-btn" onClick={onGuest}>
            Continue as Guest
          </button>
        </div>
        
        <footer className="landing-footer">
          <p>Your tasks, synced across devices with Google.</p>
        </footer>
        <LegalFooter />
      </div>

      <div className="animation-container right-anim">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>
            {`
            .board { stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 2s ease forwards; }
            .line { stroke-dasharray: 20; stroke-dashoffset: 20; animation: drawLine 1s ease forwards; }
            .line-1 { animation-delay: 1s; }
            .line-2 { animation-delay: 1.3s; }
            .check { transform: scale(0); transform-origin: center; animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 2s; }
            @keyframes draw { to { stroke-dashoffset: 0; } }
            @keyframes drawLine { to { stroke-dashoffset: 0; } }
            @keyframes pop { to { transform: scale(1); } }
            `}
          </style>
          <path className="board" d="M19 5H17C17 3.34315 15.6569 2 14 2H10C8.34315 2 7 3.34315 7 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5Z" stroke="#4F46E5" strokeWidth="1.5" />
          <path className="line line-1" d="M8 12H13" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <path className="line line-2" d="M8 16H11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          <circle className="check" cx="16" cy="14" r="5" fill="#22C55E" />
          <path className="check" d="M14 14L15.5 15.5L18 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export default LandingPage;
