import React, { useState } from 'react';
import { IconLogo, IconShare, IconUsers } from './Icons';

export function Navbar({ 
  siteName = "SyncBoard", 
  activeUsers = [], 
  currentUser, 
  isConnected = false,
  onOpenShare,
  onClearBoard,
  onExportImage
}) {
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);

  return (
    <header className="navbar-container">
      {/* Top Left: Website Name & Brand */}
      <div className="navbar-left">
        <div className="brand-badge">
          <IconLogo size={28} />
          <div className="brand-text-group">
            <span className="brand-title">{siteName}</span>
            <span className={`brand-status ${isConnected ? 'live' : 'connecting'}`}>
              <span className={`status-dot ${isConnected ? 'connected' : 'connecting'}`}></span>
              {isConnected ? 'Socket.io Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Right: User Count & Share Board */}
      <div className="navbar-right">
        {/* Active Collaborators Counter */}
        <div 
          className="active-users-pill"
          onClick={() => setShowUsersDropdown(!showUsersDropdown)}
          title="Lihat pengguna aktif"
        >
          <div className="user-avatars-stack">
            {activeUsers.slice(0, 3).map((user, idx) => (
              <div 
                key={user.id || idx}
                className="user-avatar-circle"
                style={{ backgroundColor: user.color || '#6366F1' }}
                title={user.name + (user.id === currentUser?.id ? ' (Anda)' : '')}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            ))}
          </div>
          <div className="user-count-label">
            <IconUsers size={16} />
            <span>{activeUsers.length} Online</span>
          </div>

          {/* Collaborators Dropdown */}
          {showUsersDropdown && (
            <div className="users-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <span>Kolaborator Aktif ({activeUsers.length})</span>
                <button 
                  className="dropdown-close-btn"
                  onClick={() => setShowUsersDropdown(false)}
                >
                  ✕
                </button>
              </div>
              <ul className="users-list">
                {activeUsers.map((user) => (
                  <li key={user.id} className="user-list-item">
                    <span 
                      className="user-dot" 
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="user-name">
                      {user.name} {user.id === currentUser?.id && <span className="you-tag">(Anda)</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="dropdown-hint">
                💡 Buka di tab atau jendela baru untuk melihat sinkronisasi realtime!
              </div>
            </div>
          )}
        </div>

        {/* Share Board Button */}
        <button 
          className="share-board-btn"
          onClick={onOpenShare}
          title="Bagikan papan whiteboard ini"
        >
          <IconShare size={18} />
          <span>Share Board</span>
        </button>
      </div>
    </header>
  );
}
