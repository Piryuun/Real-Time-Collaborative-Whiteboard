import React, { useState, useRef, useEffect } from 'react';
import { IconClose } from './Icons';

export function StickyNoteItem({
  note,
  zoom,
  pan,
  isSelectMode,
  onUpdate,
  onDelete,
  onStartDrag
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  // Focus textarea when editing begins
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleMouseDown = (e) => {
    // If clicking close button or textarea while editing, don't drag
    if (e.target.closest('.sticky-close-btn') || e.target.tagName === 'TEXTAREA') {
      return;
    }
    e.stopPropagation();
    onStartDrag(note.id, e.clientX, e.clientY, note.x, note.y);
  };

  return (
    <div
      className={`sticky-note-element ${isSelectMode ? 'draggable' : ''}`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width || 180}px`,
        minHeight: `${note.height || 180}px`,
        backgroundColor: note.color || '#FEF08A',
        borderColor: note.borderColor || '#FACC15',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sticky Header / Drag bar */}
      <div className="sticky-header-bar">
        <div className="sticky-pin-dot" />
        <button
          className="sticky-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          title="Hapus Sticky Note"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Sticky Note Content */}
      <textarea
        ref={textareaRef}
        className="sticky-textarea"
        value={note.text || ''}
        placeholder="Ketik catatan di sini..."
        onChange={(e) => {
          onUpdate(note.id, { text: e.target.value });
        }}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        rows={5}
      />
    </div>
  );
}
