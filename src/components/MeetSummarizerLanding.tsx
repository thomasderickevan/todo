import React, { useMemo, useState } from 'react';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './MeetSummarizerLanding.css';

const CHROME_WEB_STORE_URL = '';

const featureList = [
  {
    title: 'Live caption capture',
    description: 'Hooks into Google Meet captions and builds a meeting transcript while you talk.',
  },
  {
    title: 'Quick summary',
    description: 'Turns the transcript into a compact recap with discussion highlights and next steps.',
  },
  {
    title: 'Action extraction',
    description: 'Pulls out likely action items so your meeting does not die in chat history.',
  },
  {
    title: 'Shield-ready workflow',
    description: 'Designed to live beside Shield Gen in the same Chrome extension shell.',
  },
];

const MeetSummarizerLanding: React.FC = () => {
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const installMode = useMemo(
    () => (CHROME_WEB_STORE_URL ? 'web-store' : 'manual'),
    []
  );

  React.useEffect(() => {
    document.title = 'Meet Summarizer • endeavor';
  }, []);

  const handleAddToChrome = () => {
    if (CHROME_WEB_STORE_URL) {
      window.open(CHROME_WEB_STORE_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    setShowInstallGuide(true);
    window.setTimeout(() => {
      document.getElementById('install-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <>
      <Navbar />
      <div className="meet-landing-page">
        <section className="meet-hero">
          <div className="meet-hero-copy">
            <p className="meet-kicker">Chrome extension</p>
            <h1>Meet Summarizer</h1>
            <p className="meet-subtitle">
              Capture Google Meet captions, build a transcript, extract action items, and keep the meeting useful after the call ends.
            </p>
            <div className="meet-hero-actions">
              <button className="meet-primary-btn" onClick={handleAddToChrome}>
                Add to Chrome
              </button>
              <button
                className="meet-secondary-btn"
                onClick={() => {
                  document.getElementById('feature-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                See Features
              </button>
            </div>
            <p className="meet-install-note">
              {installMode === 'web-store'
                ? 'Installs through the Chrome Web Store.'
                : 'Chrome Web Store link is not set yet, so this button opens the current install guide.'}
            </p>
          </div>

          <div className="meet-hero-panel">
            <div className="meet-panel-header">
              <span className="meet-dot" />
              <span className="meet-dot" />
              <span className="meet-dot" />
            </div>
            <div className="meet-panel-body">
              <div className="meet-panel-block">
                <span className="meet-panel-label">Transcript</span>
                <p>Arun: let&apos;s ship the extension build this week.</p>
                <p>Maya: I&apos;ll validate the Meet caption selectors today.</p>
                <p>You: we also need the landing page and install CTA.</p>
              </div>
              <div className="meet-panel-block">
                <span className="meet-panel-label">Summary</span>
                <p>Team aligned on shipping the Chrome extension and validating real-world caption capture.</p>
              </div>
              <div className="meet-panel-block">
                <span className="meet-panel-label">Action items</span>
                <ul>
                  <li>Validate caption capture in live Meet</li>
                  <li>Publish Chrome Web Store listing</li>
                  <li>Connect summary output to tasks</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="meet-feature-grid" id="feature-grid">
          {featureList.map((feature) => (
            <article key={feature.title} className="meet-feature-card">
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="meet-install-section" id="install-guide">
          <div className="meet-install-card">
            <div className="meet-install-head">
              <div>
                <p className="meet-kicker">Install</p>
                <h2>Get it into Chrome</h2>
              </div>
              <button className="meet-secondary-btn" onClick={handleAddToChrome}>
                Add to Chrome
              </button>
            </div>

            {(showInstallGuide || installMode === 'manual') && (
              <div className="meet-install-guide">
                <p>
                  One-click browser install only works after this extension has a real Chrome Web Store listing.
                  Until that exists, use the unpacked install flow below.
                </p>
                <ol>
                  <li>Open <code>chrome://extensions</code> in Chrome.</li>
                  <li>Turn on <strong>Developer mode</strong>.</li>
                  <li>Click <strong>Load unpacked</strong>.</li>
                  <li>Select the local <code>extension</code> folder from this project.</li>
                </ol>
              </div>
            )}
          </div>
        </section>

        <LegalFooter />
      </div>
    </>
  );
};

export default MeetSummarizerLanding;
