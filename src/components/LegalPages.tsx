import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './LegalPages.css';

const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    document.title = '✦ endeavor • Privacy Policy';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="last-updated">Last Updated: April 2026</p>
      
      <section>
        <h2>The Short Version</h2>
        <p>Your data belongs to you. endeavor is built to be helpful, not to spy on you. We don't sell your data, we don't track you across the web, and we keep things as transparent as possible.</p>
      </section>

      <section>
        <h2>What We Collect</h2>
        <ul>
          <li><strong>Identity:</strong> When you sign in with Google, we see your name, email, and profile picture. This is purely to personalize your experience.</li>
          <li><strong>Content:</strong> Your tasks, voice notes, and passwords. Voice notes and tasks are stored in our secure database. Passwords are encrypted before they even leave your computer.</li>
          <li><strong>Google Drive:</strong> If you use the sync feature, we only access the specific files endeavor creates. We cannot see your other Drive files.</li>
        </ul>
      </section>

      <section>
        <h2>How Data is Stored</h2>
        <ul>
          <li><strong>Cloud:</strong> We use Firebase (by Google) to keep your notes and tasks synced across your devices.</li>
          <li><strong>Local:</strong> If you aren't signed in, your data stays right on your device in local storage.</li>
          <li><strong>Encrypted:</strong> In the Shield Vault, we use AES-256 encryption. We don't have your Master PIN, so we can't read your passwords even if we wanted to.</li>
        </ul>
      </section>

      <section>
        <h2>Analytics</h2>
        <p>We use Vercel Analytics to see how many people use the app and which features are popular. This data is anonymous and helps us make the app better.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change how we handle data, we'll update this page. By using endeavor, you're cool with how we currently do things.</p>
      </section>
    </div>
  );
};

const TermsOfService: React.FC = () => {
  useEffect(() => {
    document.title = '✦ endeavor • Terms of Service';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <h1>Terms of Service</h1>
      <p className="last-updated">Last Updated: April 2026</p>

      <section>
        <h2>Friendly Agreement</h2>
        <p>endeavor is a personal project provided "as-is". Think of it as a helpful tool shared between friends. There's no big corporation here, just code designed to help you stay organized.</p>
      </section>

      <section>
        <h2>Usage Rules</h2>
        <p>Don't try to break the app, don't use it for anything illegal, and be nice. That's pretty much it.</p>
      </section>

      <section>
        <h2>Responsibility</h2>
        <ul>
          <li><strong>Your PIN:</strong> In the Shield Vault, your Master PIN is your responsibility. If you lose it, we cannot recover your passwords because we don't store the PIN.</li>
          <li><strong>Data Loss:</strong> While we use reliable services like Google and Firebase, we aren't responsible if data gets lost. Always keep a backup (that's what the Sync to Drive button is for!).</li>
        </ul>
      </section>

      <section>
        <h2>Termination</h2>
        <p>We hope you stay forever, but you can stop using endeavor anytime. You can also delete your data through the app's interface.</p>
      </section>

      <section>
        <h2>No Warranty</h2>
        <p>Since this is a free tool provided without formal registration, we can't offer any legal warranties or guarantees. We'll do our best to keep it running smoothly, but stuff happens!</p>
      </section>
    </div>
  );
};

interface LegalPagesProps {
  type: 'privacy' | 'terms';
}

const LegalPages: React.FC<LegalPagesProps> = ({ type }) => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="legal-container">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="legal-card">
          {type === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        </div>
      </div>
    </>
  );
};

export default LegalPages;
