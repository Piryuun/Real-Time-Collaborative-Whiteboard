import React, { useState } from 'react';
import { IconShare, IconCopy, IconCheck, IconClose } from './Icons';

export function ShareModal({ isOpen, onClose, activeUsersCount = 1 }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <IconShare size={20} />
            </div>
            <div>
              <h3>Share Whiteboard</h3>
              <p>Undang tim untuk berkolaborasi secara real-time</p>
            </div>
          </div>
          <button className="modal-close-icon" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>

        <div className="modal-body">
          <label className="input-label">Tautan Kolaborasi</label>
          <div className="share-link-row">
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              className="share-link-input"
              onClick={(e) => e.target.select()}
            />
            <button 
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <IconCheck size={16} />
                  <span>Disalin!</span>
                </>
              ) : (
                <>
                  <IconCopy size={16} />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>

          <div className="share-features-box">
            <div className="feature-item">
              <span className="feature-dot">⚡</span>
              <div>
                <strong>Sinkronisasi Instan</strong>
                <p>Setiap goresan pulpen, teks, dan sticky note langsung tersinkron ke semua tab & browser.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-dot">👥</span>
              <div>
                <strong>Live Multiplayer Cursors</strong>
                <p>Gerakan mouse peserta lain terlihat langsung di kanvas dengan nama & warna masing-masing.</p>
              </div>
            </div>
          </div>

          <div className="quick-test-box">
            <span>Ingin uji kolaborasi realtime sekarang?</span>
            <button className="open-tab-btn" onClick={handleOpenNewTab}>
              Buka Tab Baru ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
