import React from 'react';

export function MultiplayerCursors({ cursors, zoom, pan }) {
  if (!cursors || Object.keys(cursors).length === 0) return null;

  return (
    <div className="multiplayer-cursors-layer" style={{ pointerEvents: 'none' }}>
      {Object.entries(cursors).map(([id, cursor]) => {
        // Transform canvas coordinates into screen coordinates
        const screenX = cursor.x * zoom + pan.x;
        const screenY = cursor.y * zoom + pan.y;

        return (
          <div
            key={id}
            className="remote-cursor-wrapper"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 0.08s ease-out',
            }}
          >
            {/* Custom SVG pointer styled with collaborator's color */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={cursor.color || '#6366F1'}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="remote-cursor-pointer"
            >
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
            
            {/* Collaborator Name Tag */}
            <span
              className="remote-cursor-tag"
              style={{ backgroundColor: cursor.color || '#6366F1' }}
            >
              {cursor.name || 'Kolaborator'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
