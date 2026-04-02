import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const logoE = '/endeavor-e.png';

interface NavbarProps {
  showLinks?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ showLinks = true }) => {
  const navigate = useNavigate();

  return (
    <nav className="mc-navbar">
      <div className="mc-navbar-content">
        <div className="mc-navbar-left" onClick={() => navigate('/')}>
          <img src={logoE} alt="e" className="mc-navbar-logo" />
          <span className="mc-navbar-brand">ENDEAVOR_</span>
        </div>
        
        {showLinks && (
          <div className="mc-navbar-right">
            <ul className="mc-nav-links">
              <li><button onClick={() => navigate('/portal')}>PORTAL</button></li>
              <li><button onClick={() => navigate('/')}>SYSTEM_HOME</button></li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
