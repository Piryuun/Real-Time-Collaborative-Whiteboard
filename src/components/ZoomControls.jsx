import React from 'react';
import { IconZoomIn, IconZoomOut, IconReset } from './Icons';

export function ZoomControls({
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  const percentage = Math.round(zoom * 100);

  return (
    <div className="zoom-controls-container">
      <div className="zoom-card">
        {/* Zoom Out Button */}
        <button 
          className="zoom-btn"
          onClick={onZoomOut}
          title="Zoom Out (Scroll wheel down / -)"
        >
          <IconZoomOut size={18} />
        </button>

        {/* Zoom Percentage Label (Clickable to reset) */}
        <button 
          className="zoom-percentage-btn"
          onClick={onResetZoom}
          title="Klik untuk reset zoom ke 100%"
        >
          {percentage}%
        </button>

        {/* Zoom In Button */}
        <button 
          className="zoom-btn"
          onClick={onZoomIn}
          title="Zoom In (Scroll wheel up / +)"
        >
          <IconZoomIn size={18} />
        </button>

        <div className="zoom-divider" />

        {/* Reset View Button */}
        <button
          className="zoom-btn reset-btn"
          onClick={onResetZoom}
          title="Reset ke posisi tengah (100%)"
        >
          <IconReset size={16} />
        </button>
      </div>
    </div>
  );
}
