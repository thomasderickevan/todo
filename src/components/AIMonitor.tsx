import React from 'react';
import { Link } from 'react-router-dom';
import './AIMonitor.css';

const AIMonitor: React.FC = () => (
  <div className="ai-monitor-shell">
    <header className="ai-monitor-header">
      <p className="ai-monitor-kicker">AGENT MONITOR</p>
      <h1>Observing your AI ecosystem</h1>
      <p className="ai-monitor-subtext">
        Live telemetry for the assistant: recent commands, latency metrics, and system health.
      </p>
    </header>
    <section className="ai-monitor-panel">
      <div className="ai-monitor-card">
        <span className="ai-monitor-label">Latency</span>
        <strong>42ms</strong>
        <p>Average response time across the last 10 prompts.</p>
      </div>
      <div className="ai-monitor-card">
        <span className="ai-monitor-label">Session</span>
        <strong>Active</strong>
        <p>Vision guard running · voice module ready</p>
      </div>
      <div className="ai-monitor-card">
        <span className="ai-monitor-label">Momentum</span>
        <strong>+18%</strong>
        <p>Productivity lift since the assistant was activated.</p>
      </div>
    </section>
    <div className="ai-monitor-actions">
      <Link to="/portal" className="ai-monitor-secondary">Return to Portal</Link>
      <button className="ai-monitor-primary">Refresh telemetry</button>
    </div>
  </div>
);

export default AIMonitor;
