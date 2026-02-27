import React from 'react';
import './Navbar.css';

interface NavbarProps {
  onHomeClick?: () => void;
  showLinks?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onHomeClick, showLinks = true }) => {
  const scrollToAndHighlight = (id: string, highlightClass: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Trigger highlight animation
      element.classList.remove(highlightClass);
      void (element as any).offsetWidth; // Trigger reflow
      element.classList.add(highlightClass);
      
      // Cleanup class after animation
      setTimeout(() => {
        element.classList.remove(highlightClass);
      }, 1500);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left" onClick={onHomeClick}>
          <div className="brand-logo">
            <span className="logo-emoji">✅</span>
            <span className="brand-name">TaskMaster</span>
          </div>
        </div>
        
        {showLinks && (
          <div className="navbar-right">
            <ul className="nav-links">
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick?.(); }}>
                  <span className="nav-icon">🏠</span> Home
                </a>
              </li>
              <li>
                <a href="#tasks" onClick={(e) => { e.preventDefault(); scrollToAndHighlight('tasks-section', 'highlight-tasks'); }}>
                  Tasks
                </a>
              </li>
              <li>
                <a href="#assistant" onClick={(e) => { e.preventDefault(); scrollToAndHighlight('assistant-section', 'highlight-assistant'); }}>
                  AI Helper
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
