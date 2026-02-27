import React, { useState } from 'react';
import './LegalFooter.css';

const LegalFooter: React.FC = () => {
  const [showSarcasm, setShowSarcasm] = useState(false);
  const [activeType, setActiveType] = useState('');

  const triggerSarcasm = (type: string) => {
    setActiveType(type);
    setShowSarcasm(true);
  };

  const closeSarcasm = () => {
    setShowSarcasm(false);
  };

  return (
    <>
      <footer className="legal-footer">
        <button onClick={() => triggerSarcasm('Privacy Policy')}>Privacy Policy</button>
        <span className="dot">•</span>
        <button onClick={() => triggerSarcasm('Terms of Service')}>Terms of Service</button>
      </footer>

      {showSarcasm && (
        <div className="sarcastic-overlay" onClick={closeSarcasm}>
          <div className="sarcastic-content" onClick={(e) => e.stopPropagation()}>
            <button className="sarcastic-close-btn" onClick={closeSarcasm}>&times;</button>
            <div className="emoji-explosion">😂🤣😆</div>
            <h2>Wait, a {activeType}?!</h2>
            <p>Bro, it's literally a TODO LIST. What are you worried about? <br/> 
            Are the FBI going to raid you for not finishing "Buy Milk"?</p>
            <div className="emoji-giant">💀</div>
            <p className="sub-text">Just do your tasks and stop reading non-existent legalese!</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LegalFooter;
