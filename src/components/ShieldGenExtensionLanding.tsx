import React, { useMemo } from 'react';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './ShieldGenExtensionLanding.css';

const CHROME_WEB_STORE_URL = '';
const EXTENSION_DOWNLOAD_URL = '/downloads/endeavor-shield-gen-extension.zip';

const featureList = [
  {
    title: 'Password generator',
    description: 'Create strong random passwords or passphrases with adjustable length and character rules.',
  },
  {
    title: 'Locked vault',
    description: 'Protect saved credentials behind one master PIN inside the extension popup.',
  },
  {
    title: 'Site-aware matches',
    description: 'Surface the most relevant saved entries for the active website first.',
  },
  {
    title: 'Quick fill',
    description: 'Fill username and password fields on the current site without leaving the tab.',
  },
];

const usageSteps = [
  'Open the extension popup and create your master PIN the first time.',
  'Generate a password or passphrase from the Generator section.',
  'Save the credential with service name, username, and site origin.',
  'Open that website later and use the popup to find the matching entry.',
  'Fill, copy, export, or import credentials from the vault as needed.',
];

const ShieldGenExtensionLanding: React.FC = () => {
  const installMode = useMemo(
    () => (CHROME_WEB_STORE_URL ? 'web-store' : 'manual'),
    []
  );

  React.useEffect(() => {
    document.title = 'Shield Gen Extension • endeavor';
  }, []);

  return (
    <>
      <Navbar />
      <div className="shield-extension-page">
        <section className="shield-extension-hero">
          <div className="shield-extension-copy">
            <p className="shield-extension-kicker">Chrome extension</p>
            <h1>Shield Gen Extension</h1>
            <p className="shield-extension-subtitle">
              A password manager and generator for Chrome. It stores logins in the extension,
              protects them with a master PIN, and helps you fill credentials on the current site.
            </p>
            <div className="shield-extension-actions">
              <a className="shield-extension-primary shield-extension-link" href={EXTENSION_DOWNLOAD_URL} download>
                Download Extension
              </a>
              <button
                className="shield-extension-secondary"
                onClick={() => {
                  document.getElementById('usage-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                View Usage
              </button>
            </div>
            <p className="shield-extension-note">
              {installMode === 'web-store'
                ? 'Install from the Chrome Web Store.'
                : 'Use the unpacked install flow for now. The download link can be replaced with a store listing later.'}
            </p>
          </div>

          <div className="shield-extension-panel">
            <div className="shield-extension-panel-header">
              <span className="shield-extension-dot" />
              <span className="shield-extension-dot" />
              <span className="shield-extension-dot" />
            </div>
            <div className="shield-extension-panel-body">
              <div className="shield-extension-block">
                <span className="shield-extension-label">Current site</span>
                <p>github.com</p>
              </div>
              <div className="shield-extension-block">
                <span className="shield-extension-label">Generator</span>
                <p>Mode: Password</p>
                <p>Length: 16</p>
                <p>Strength: Very strong</p>
              </div>
              <div className="shield-extension-block">
                <span className="shield-extension-label">Vault actions</span>
                <ul>
                  <li>Save login</li>
                  <li>Fill on page</li>
                  <li>Copy user or password</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="shield-extension-feature-grid">
          {featureList.map((feature) => (
            <article key={feature.title} className="shield-extension-feature-card">
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="shield-extension-guide-grid" id="usage-guide">
          <article className="shield-extension-guide-card">
            <div className="shield-extension-guide-head">
              <div>
                <p className="shield-extension-kicker">Install</p>
                <h2>Get it into Chrome</h2>
              </div>
            </div>
            <div className="shield-extension-guide-body">
              <p>
                This extension is password-manager-only. It no longer includes the Meet capture flow.
              </p>
              <ol>
                <li>Open <code>chrome://extensions</code> in Chrome.</li>
                <li>Turn on <strong>Developer mode</strong>.</li>
                <li>Click <strong>Load unpacked</strong>.</li>
                <li>Select the <code>extension</code> folder from this project.</li>
                <li>Pin the extension so Shield Gen is easy to access.</li>
              </ol>
            </div>
          </article>

          <article className="shield-extension-guide-card">
            <div className="shield-extension-guide-head">
              <div>
                <p className="shield-extension-kicker">Usage</p>
                <h2>How to use Shield Gen</h2>
              </div>
            </div>
            <div className="shield-extension-guide-body">
              <ol>
                {usageSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </article>
        </section>

        <LegalFooter />
      </div>
    </>
  );
};

export default ShieldGenExtensionLanding;
