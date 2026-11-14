import React, { useState } from 'react';
import { 
  IconPen, 
  IconText, 
  IconStickyNote, 
  IconPointer, 
  IconHand, 
  IconEraser, 
  IconSquare, 
  IconCircle, 
  IconArrow,
  IconUndo,
  IconRedo,
  IconTrash
} from './Icons';

export const COLORS = [
  { name: 'Black', hex: '#1E293B' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
];

export const STICKY_COLORS = [
  { name: 'Yellow', hex: '#FEF08A', border: '#FACC15' },
  { name: 'Blue', hex: '#BAE6FD', border: '#38BDF8' },
  { name: 'Pink', hex: '#FBCFE8', border: '#F472B6' },
  { name: 'Green', hex: '#BBF7D0', border: '#4ADE80' },
  { name: 'Orange', hex: '#FED7AA', border: '#FB923C' },
  { name: 'Purple', hex: '#DDD6FE', border: '#A78BFA' },
];

export const STROKE_WIDTHS = [
  { label: 'S', width: 2 },
  { label: 'M', width: 4 },
  { label: 'L', width: 8 },
  { label: 'XL', width: 14 },
];

export function Toolbar({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  strokeWidth,
  setStrokeWidth,
  stickyColor,
  setStickyColor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearBoard
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const mainTools = [
    { id: 'select', label: 'Select / Move (V)', icon: <IconPointer size={20} /> },
    { id: 'hand', label: 'Pan Canvas (H / Space)', icon: <IconHand size={20} /> },
    { id: 'pen', label: 'Pulpen / Freehand (P)', icon: <IconPen size={20} /> },
    { id: 'text', label: 'Teks (T)', icon: <IconText size={20} /> },
    { id: 'sticky', label: 'Sticky Note (S)', icon: <IconStickyNote size={20} /> },
    { id: 'rect', label: 'Rectangle (R)', icon: <IconSquare size={20} /> },
    { id: 'circle', label: 'Circle (C)', icon: <IconCircle size={20} /> },
    { id: 'arrow', label: 'Panah / Arrow (A)', icon: <IconArrow size={20} /> },
    { id: 'eraser', label: 'Penghapus (E)', icon: <IconEraser size={20} /> },
  ];

  return (
    <aside className="toolbar-container">
      {/* Primary Tool Buttons */}
      <div className="toolbar-card">
        {mainTools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTool(tool.id);
                if (tool.id === 'pen' || tool.id === 'rect' || tool.id === 'circle' || tool.id === 'arrow' || tool.id === 'sticky') {
                  setShowColorPicker(true);
                }
              }}
              title={tool.label}
            >
              {tool.icon}
            </button>
          );
        })}

        <div className="toolbar-divider" />

        {/* Color / Style Trigger */}
        <button
          className={`tool-btn color-trigger-btn ${showColorPicker ? 'active' : ''}`}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Ubah Warna & Ukuran Garis"
        >
          <span 
            className="color-indicator-circle"
            style={{ 
              backgroundColor: activeTool === 'sticky' ? stickyColor.border : currentColor 
            }} 
          />
        </button>

        <div className="toolbar-divider" />

        {/* History actions: Undo / Redo */}
        <button
          className="tool-btn sub-action"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <IconUndo size={18} />
        </button>
        <button
          className="tool-btn sub-action"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <IconRedo size={18} />
        </button>

        <div className="toolbar-divider" />

        {/* Clear canvas */}
        <button
          className="tool-btn sub-action danger"
          onClick={onClearBoard}
          title="Hapus Semua Kanvas"
        >
          <IconTrash size={18} />
        </button>
      </div>

      {/* Popout Property Sub-panel (Colors & Sizes) */}
      {showColorPicker && (
        <div className="style-popout-card">
          {activeTool === 'sticky' ? (
            <div className="style-section">
              <span className="style-title">Warna Sticky Note</span>
              <div className="sticky-color-grid">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={`sticky-color-swatch ${stickyColor.name === c.name ? 'selected' : ''}`}
                    style={{ backgroundColor: c.hex, borderColor: c.border }}
                    onClick={() => setStickyColor(c)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="style-section">
                <span className="style-title">Pilihan Warna</span>
                <div className="color-swatch-grid">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      className={`color-swatch-btn ${currentColor === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setCurrentColor(c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="style-section">
                <span className="style-title">Ketebalan Garis</span>
                <div className="stroke-width-group">
                  {STROKE_WIDTHS.map((s) => (
                    <button
                      key={s.label}
                      className={`stroke-btn ${strokeWidth === s.width ? 'selected' : ''}`}
                      onClick={() => setStrokeWidth(s.width)}
                    >
                      <span 
                        className="stroke-preview-line" 
                        style={{ height: `${s.width}px`, backgroundColor: currentColor }} 
                      />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
