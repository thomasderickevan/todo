import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  showLinks?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showLinks = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLinkClick = (id: string, highlightClass: string) => {
    if (location.pathname !== '/todo') {
      navigate('/todo');
      // After navigation, we need to wait for the component to mount before scrolling.
      // A small timeout or a check in TodoApp's useEffect would be better, 
      // but for simple cases, a hash check in TodoApp works well.
      return;
    }
    
    scrollToAndHighlight(id, highlightClass);
  };

  const scrollToAndHighlight = (id: string, highlightClass: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      element.classList.remove(highlightClass);
      void (element as any).offsetWidth; // Trigger reflow
      element.classList.add(highlightClass);
      
      setTimeout(() => {
        element.classList.remove(highlightClass);
      }, 1500);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left" onClick={() => navigate('/')}>
          <div className="brand-logo">
            <span className="logo-emoji">🏠</span>
            <span className="brand-name">ederick portal</span>
          </div>
        </div>
        
        {showLinks && (
          <div className="navbar-right">
            <ul className="nav-links">
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                   Portal
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLinkClick('tasks-section', 'highlight-tasks'); }}>
                  Tasks
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLinkClick('assistant-section', 'highlight-assistant'); }}>
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
