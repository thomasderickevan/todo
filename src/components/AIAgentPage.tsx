import React from 'react';
import { Link } from 'react-router-dom';
import AIAssistant from './AIAssistant';
import './AIAgentPage.css';

const AIAgentPage: React.FC = () => (
  <div className="ai-agent-page">
    <div className="ai-agent-hero">
      <p className="ai-agent-kicker">AGENT_V1 // READY</p>
      <h1>The assistant tuned for productivity</h1>
      <p>
        A living agent that listens, watches, and helps you move faster. It speaks when you need help,
        helps you add tasks by voice, and watches the room when you hit focus mode.
      </p>
      <div className="ai-agent-links">
        <Link className="ai-agent-link" to="/portal">Launch the Portal</Link>
        <Link className="ai-agent-link subtle" to="/ai-monitor">Open the Monitor</Link>
      </div>
    </div>

    <div className="ai-agent-core">
      <AIAssistant onAddTask={() => {}} onClearList={() => {}} />
    </div>
  </div>
);

export default AIAgentPage;
