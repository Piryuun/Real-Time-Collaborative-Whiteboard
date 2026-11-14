import React, { useState, useRef, useEffect } from 'react';
import { IconClose } from './Icons';

export function TextItem({
  textItem,
  isSelectMode,
  onUpdate,
  onDelete,
  onStartDrag
}) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.text-close-btn') || e.target.tagName === 'INPUT' || isEditing) {
      return;
    }
    e.stopPropagation();
    onStartDrag(textItem.id, e.clientX, e.clientY, textItem.x, textItem.y);
  };

  return (
    <div
      className={`canvas-text-element ${isSelectMode ? 'draggable' : ''} ${isEditing ? 'editing' : ''}`}
      style={{
        left: `${textItem.x}px`,
        top: `${textItem.y}px`,
        color: textItem.color || '#1E293B',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="text-inline-input"
          value={textItem.text || ''}
          placeholder="Ketik teks..."
          onChange={(e) => onUpdate(textItem.id, { text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditing(false);
          }}
          style={{ color: textItem.color || '#1E293B' }}
        />
      ) : (
        <div className="text-display-content">
          <span>{textItem.text || 'Klik ganda untuk mengetik teks'}</span>
          <button
            className="text-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(textItem.id);
            }}
            title="Hapus Teks"
          >
            <IconClose size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
