import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StickyNoteItem } from './StickyNoteItem';
import { TextItem } from './TextItem';
import { MultiplayerCursors } from './MultiplayerCursors';

export function WhiteboardCanvas({
  activeTool,
  setActiveTool,
  currentColor,
  strokeWidth,
  stickyColor,
  zoom,
  setZoom,
  pan,
  setPan,
  elements,
  setElements,
  onSaveElements,
  broadcast,
  sendCursorPosition,
  remoteCursors
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [currentStroke, setCurrentStroke] = useState(null);
  const [shapePreview, setShapePreview] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [, setWindowResize] = useState(0);

  // Fallback to setElements if onSaveElements is not passed
  const saveElements = useCallback((nextElements) => {
    if (onSaveElements) {
      onSaveElements(nextElements);
    } else {
      setElements(nextElements);
    }
  }, [onSaveElements, setElements]);

  // Convert screen coordinates to canvas world coordinates (infinite 2D plane)
  const screenToCanvas = useCallback((clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    return {
      x: (mouseX - pan.x) / zoom,
      y: (mouseY - pan.y) / zoom
    };
  }, [zoom, pan]);

  // Handle window resizing to keep canvas sharp & responsive
  useEffect(() => {
    const handleResize = () => setWindowResize((prev) => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Spacebar pan toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom in / out with SCROLL WHEEL (centered on mouse pointer position)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.15), 4.0);
        
        // Adjust pan offset so the point under cursor remains stationary
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom),
          y: mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom)
        }));

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setZoom, setPan]);

  // Draw a freehand stroke or shape on canvas
  const drawShape = useCallback((ctx, shape) => {
    const { shapeType, startX, startY, endX, endY, color, width } = shape;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (shapeType === 'rect') {
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);
      ctx.strokeRect(x, y, w, h);
    } else if (shapeType === 'circle') {
      const radiusX = Math.abs(endX - startX) / 2;
      const radiusY = Math.abs(endY - startY) / 2;
      const centerX = Math.min(startX, endX) + radiusX;
      const centerY = Math.min(startY, endY) + radiusY;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, Math.max(0.5, radiusX), Math.max(0.5, radiusY), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shapeType === 'arrow') {
      // Main line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(endY - startY, endX - startX);
      const headlen = Math.max(12, 10 + width * 1.5);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headlen * Math.cos(angle - Math.PI / 6),
        endY - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headlen * Math.cos(angle + Math.PI / 6),
        endY - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const drawStroke = useCallback((ctx, stroke) => {
    if (!stroke) return;

    // 1. Check if shape FIRST!
    if (stroke.type === 'shape') {
      drawShape(ctx, stroke);
      return;
    }

    // 2. Freehand drawing points
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, [drawShape]);

  // REDRAW VIEWPORT CANVAS (Infinite 2D canvas with hardware acceleration & HiDPI support)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Reset transform to identity and clear screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Scale for device pixel ratio (HiDPI / Retina)
    ctx.scale(dpr, dpr);

    // Apply viewport PAN and ZOOM to world coordinates
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw all completed strokes and shapes
    elements.strokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // Draw active stroke currently being drawn
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }

    // Draw shape preview currently being dragged
    if (shapePreview) {
      drawShape(ctx, shapePreview);
    }

    ctx.restore();
  }, [elements.strokes, currentStroke, shapePreview, pan, zoom, drawStroke, drawShape]);

  // Eraser helper
  const handleEraseAt = (point) => {
    const threshold = 18;
    const remaining = elements.strokes.filter((stroke) => {
      if (stroke.type === 'shape') {
        const minX = Math.min(stroke.startX, stroke.endX) - threshold;
        const maxX = Math.max(stroke.startX, stroke.endX) + threshold;
        const minY = Math.min(stroke.startY, stroke.endY) - threshold;
        const maxY = Math.max(stroke.startY, stroke.endY) + threshold;
        const isNear = point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
        return !isNear;
      }
      return !stroke.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < threshold);
    });

    if (remaining.length !== elements.strokes.length) {
      const next = { ...elements, strokes: remaining };
      saveElements(next);
      broadcast('SYNC_STROKES', { strokes: remaining });
    }
  };

  // Mouse Down handler
  const handleMouseDown = (e) => {
    // If middle click or spacebar held or pan tool active: start panning
    if (e.button === 1 || isSpacePressed || activeTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing/tools

    const canvasPoint = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === 'pen') {
      setIsDrawing(true);
      const newStroke = {
        id: 'stroke_' + Math.random().toString(36).substring(2, 9),
        color: currentColor,
        width: strokeWidth,
        points: [canvasPoint]
      };
      setCurrentStroke(newStroke);
    } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') {
      setIsDrawing(true);
      setShapePreview({
        shapeType: activeTool,
        startX: canvasPoint.x,
        startY: canvasPoint.y,
        endX: canvasPoint.x,
        endY: canvasPoint.y,
        color: currentColor,
        width: strokeWidth
      });
    } else if (activeTool === 'eraser') {
      setIsDrawing(true);
      handleEraseAt(canvasPoint);
    } else if (activeTool === 'sticky') {
      // Place sticky note at clicked location
      const newSticky = {
        id: 'sticky_' + Math.random().toString(36).substring(2, 9),
        x: canvasPoint.x - 90,
        y: canvasPoint.y - 70,
        width: 190,
        height: 180,
        color: stickyColor.hex,
        borderColor: stickyColor.border,
        text: ''
      };
      const next = {
        ...elements,
        stickies: [...elements.stickies, newSticky]
      };
      saveElements(next);
      broadcast('ADD_STICKY', newSticky);
      setActiveTool('select');
    } else if (activeTool === 'text') {
      // Place text block at clicked location
      const newText = {
        id: 'text_' + Math.random().toString(36).substring(2, 9),
        x: canvasPoint.x,
        y: canvasPoint.y,
        color: currentColor,
        text: 'Klik ganda untuk edit teks'
      };
      const next = {
        ...elements,
        texts: [...elements.texts, newText]
      };
      saveElements(next);
      broadcast('ADD_TEXT', newText);
      setActiveTool('select');
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e) => {
    const canvasPoint = screenToCanvas(e.clientX, e.clientY);
    sendCursorPosition(canvasPoint.x, canvasPoint.y);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (draggedItem) {
      const dx = (e.clientX - draggedItem.startX) / zoom;
      const dy = (e.clientY - draggedItem.startY) / zoom;
      const newX = draggedItem.origX + dx;
      const newY = draggedItem.origY + dy;

      if (draggedItem.type === 'sticky') {
        setElements((prev) => ({
          ...prev,
          stickies: prev.stickies.map((s) => s.id === draggedItem.id ? { ...s, x: newX, y: newY } : s)
        }));
      } else if (draggedItem.type === 'text') {
        setElements((prev) => ({
          ...prev,
          texts: prev.texts.map((t) => t.id === draggedItem.id ? { ...t, x: newX, y: newY } : t)
        }));
      }
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen' && currentStroke) {
      setCurrentStroke((prev) => ({
        ...prev,
        points: [...prev.points, canvasPoint]
      }));
    } else if (shapePreview) {
      setShapePreview((prev) => ({
        ...prev,
        endX: canvasPoint.x,
        endY: canvasPoint.y
      }));
    } else if (activeTool === 'eraser') {
      handleEraseAt(canvasPoint);
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggedItem) {
      const item = elements.stickies.find((s) => s.id === draggedItem.id) ||
                   elements.texts.find((t) => t.id === draggedItem.id);
      if (item) {
        saveElements(elements);
        if (draggedItem.type === 'sticky') {
          broadcast('UPDATE_STICKY', item);
        } else {
          broadcast('UPDATE_TEXT', item);
        }
      }
      setDraggedItem(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pen' && currentStroke) {
      if (currentStroke.points.length > 0) {
        const next = {
          ...elements,
          strokes: [...elements.strokes, currentStroke]
        };
        saveElements(next);
        broadcast('ADD_STROKE', currentStroke);
      }
      setCurrentStroke(null);
    } else if (shapePreview) {
      const dx = Math.abs(shapePreview.endX - shapePreview.startX);
      const dy = Math.abs(shapePreview.endY - shapePreview.startY);

      // Save shape if user actually dragged it (> 2px)
      if (dx > 2 || dy > 2) {
        const completedShape = {
          id: 'shape_' + Math.random().toString(36).substring(2, 9),
          type: 'shape',
          ...shapePreview
        };
        const next = {
          ...elements,
          strokes: [...elements.strokes, completedShape]
        };
        saveElements(next);
        broadcast('ADD_STROKE', completedShape);
      }
      setShapePreview(null);
    }
  };

  // Sticky note handlers
  const handleUpdateSticky = (id, updates) => {
    setElements((prev) => {
      const updated = prev.stickies.map((s) => s.id === id ? { ...s, ...updates } : s);
      const note = updated.find((s) => s.id === id);
      if (note) broadcast('UPDATE_STICKY', note);
      return { ...prev, stickies: updated };
    });
  };

  const handleDeleteSticky = (id) => {
    const next = {
      ...elements,
      stickies: elements.stickies.filter((s) => s.id !== id)
    };
    saveElements(next);
    broadcast('DELETE_STICKY', { id });
  };

  const handleStartDragSticky = (id, clientX, clientY, origX, origY) => {
    setDraggedItem({
      id,
      type: 'sticky',
      startX: clientX,
      startY: clientY,
      origX,
      origY
    });
  };

  // Text handlers
  const handleUpdateText = (id, updates) => {
    setElements((prev) => {
      const updated = prev.texts.map((t) => t.id === id ? { ...t, ...updates } : t);
      const textItem = updated.find((t) => t.id === id);
      if (textItem) broadcast('UPDATE_TEXT', textItem);
      return { ...prev, texts: updated };
    });
  };

  const handleDeleteText = (id) => {
    const next = {
      ...elements,
      texts: elements.texts.filter((t) => t.id !== id)
    };
    saveElements(next);
    broadcast('DELETE_TEXT', { id });
  };

  const handleStartDragText = (id, clientX, clientY, origX, origY) => {
    setDraggedItem({
      id,
      type: 'text',
      startX: clientX,
      startY: clientY,
      origX,
      origY
    });
  };

  const getCursorClass = () => {
    if (isSpacePressed || activeTool === 'hand') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (activeTool === 'pen') return 'cursor-pen';
    if (activeTool === 'eraser') return 'cursor-eraser';
    if (activeTool === 'text') return 'cursor-text-tool';
    if (activeTool === 'sticky') return 'cursor-sticky-tool';
    if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') return 'cursor-crosshair';
    return 'cursor-default';
  };

  return (
    <div
      ref={containerRef}
      className={`whiteboard-canvas-viewport ${getCursorClass()}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDrawing(false);
        setIsPanning(false);
        setDraggedItem(null);
      }}
    >
      {/* Background Infinite Grid Pattern */}
      <div 
        className="canvas-grid-pattern"
        style={{
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px`
        }}
      />

      {/* Infinite Drawing Canvas (Full Viewport, hardware accelerated, boundless drawing) */}
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
      />

      {/* Transformed DOM Layer for Sticky Notes & Texts */}
      <div
        className="canvas-world-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <div className="stickies-overlay-container">
          {elements.stickies.map((note) => (
            <StickyNoteItem
              key={note.id}
              note={note}
              zoom={zoom}
              pan={pan}
              isSelectMode={activeTool === 'select' || activeTool === 'hand'}
              onUpdate={handleUpdateSticky}
              onDelete={handleDeleteSticky}
              onStartDrag={handleStartDragSticky}
            />
          ))}
        </div>

        <div className="texts-overlay-container">
          {elements.texts.map((textItem) => (
            <TextItem
              key={textItem.id}
              textItem={textItem}
              isSelectMode={activeTool === 'select' || activeTool === 'hand'}
              onUpdate={handleUpdateText}
              onDelete={handleDeleteText}
              onStartDrag={handleStartDragText}
            />
          ))}
        </div>
      </div>

      {/* Multiplayer Cursors Layer */}
      <MultiplayerCursors cursors={remoteCursors} zoom={zoom} pan={pan} />
    </div>
  );
}
