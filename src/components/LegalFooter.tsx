import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LegalFooter.css';

const LegalFooter: React.FC = () => {
  const [showSarcasm, setShowSarcasm] = useState(false);

  const closeSarcasm = () => {
    setShowSarcasm(false);
  };

  return (
    <>
      <footer className="legal-footer">
        <Link to="/privacy">Privacy Policy</Link>
        <span className="dot">•</span>
        <Link to="/terms">Terms of Service</Link>
        <span className="dot">•</span>
        <button className="sarcasm-toggle" onClick={() => setShowSarcasm(true)}>Legal Nerd? 🤓</button>
      </footer>

      {showSarcasm && (
        <div className="sarcastic-overlay" onClick={closeSarcasm}>
          <div className="sarcastic-content" onClick={(e) => e.stopPropagation()}>
            <button className="sarcastic-close-btn" onClick={closeSarcasm}>&times;</button>
            <div className="emoji-explosion">😂🤣😆</div>
            <h2>Wait, actual legal stuff?!</h2>
            <p>Bro, we actually added real policies because you're that serious about a Todo list. <br/> 
            Go back and click the actual links if you really want to read them! 💀</p>
            <div className="emoji-giant">📦</div>
            <p className="sub-text">But seriously, your data is safe. We're just having some fun.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalFooter;
