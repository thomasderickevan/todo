import React from 'react';
import './GuestStorageNotice.css';

interface GuestStorageNoticeProps {
  storageKey: string;
  title?: string;
  message: string;
}

const GuestStorageNotice: React.FC<GuestStorageNoticeProps> = ({
  storageKey,
  title = 'Not signed in',
  message,
}) => {
  const [isVisible, setIsVisible] = React.useState(() => {
    return sessionStorage.getItem(storageKey) !== 'dismissed';
  });

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, 'dismissed');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="guest-storage-notice" role="status" aria-live="polite">
      <div className="guest-storage-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      <button type="button" className="guest-storage-close" onClick={handleDismiss}>
        Got it
      </button>
    </div>
  );
};

export default GuestStorageNotice;
