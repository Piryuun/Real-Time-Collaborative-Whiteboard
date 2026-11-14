import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Toolbar, STICKY_COLORS } from './components/Toolbar';
import { ZoomControls } from './components/ZoomControls';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { ShareModal } from './components/ShareModal';
import { useCollaboration } from './hooks/useCollaboration';

const INITIAL_BOARD = {
  strokes: [],
  stickies: [
    {
      id: 'sticky_welcome_1',
      x: 380,
      y: 220,
      width: 220,
      height: 180,
      color: '#FEF08A',
      borderColor: '#FACC15',
      text: '✨ Selamat Datang!\n\n• Gunakan Scroll Wheel untuk Zoom In/Out\n• Pilih Pulpen di kiri untuk menggambar\n• Klik Share Board di kanan atas untuk kolaborasi realtime!'
    },
    {
      id: 'sticky_welcome_2',
      x: 650,
      y: 220,
      width: 200,
      height: 180,
      color: '#BAE6FD',
      borderColor: '#38BDF8',
      text: '💡 Kolaborasi Realtime\n\nBuka whiteboard ini di tab atau browser lain untuk melihat kursor & goresan realtime!'
    }
  ],
  texts: [
    {
      id: 'text_title_demo',
      x: 380,
      y: 150,
      color: '#3B82F6',
      text: '🚀 Realtime Collaborative Whiteboard'
    }
  ]
};

export default function App() {
  const [elements, setElements] = useState(() => {
    const saved = localStorage.getItem('collab_board_elements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.stickies || parsed.strokes) return parsed;
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_BOARD;
  });

  const [activeTool, setActiveTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#1E293B');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Undo / Redo history
  const [history, setHistory] = useState([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('collab_board_elements', JSON.stringify(elements));
  }, [elements]);

  const updateElementsWithHistory = useCallback((newElements) => {
    setElements(newElements);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newElements];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Handle incoming remote action from another collaborator
  const handleRemoteAction = useCallback((type, payload) => {
    setElements((prev) => {
      switch (type) {
        case 'INIT_BOARD':
          return payload && (payload.strokes || payload.stickies || payload.texts) ? payload : prev;
        case 'ADD_STROKE':
          return { ...prev, strokes: [...prev.strokes, payload] };
        case 'SYNC_STROKES':
          return { ...prev, strokes: payload.strokes };
        case 'ADD_STICKY':
          return { ...prev, stickies: [...prev.stickies, payload] };
        case 'UPDATE_STICKY':
          return {
            ...prev,
            stickies: prev.stickies.map((s) => s.id === payload.id ? { ...s, ...payload } : s)
          };
        case 'DELETE_STICKY':
          return {
            ...prev,
            stickies: prev.stickies.filter((s) => s.id !== payload.id)
          };
        case 'ADD_TEXT':
          return { ...prev, texts: [...prev.texts, payload] };
        case 'UPDATE_TEXT':
          return {
            ...prev,
            texts: prev.texts.map((t) => t.id === payload.id ? { ...t, ...payload } : t)
          };
        case 'DELETE_TEXT':
          return {
            ...prev,
            texts: prev.texts.filter((t) => t.id !== payload.id)
          };
        case 'CLEAR_BOARD':
          return { strokes: [], stickies: [], texts: [] };
        case 'SYNC_BOARD_STATE':
          // If we have default/empty board, adopt existing board from other users
          if (prev.strokes.length === 0 && prev.stickies.length <= 2) {
            return payload;
          }
          return prev;
        default:
          return prev;
      }
    });
  }, []);

  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const getBoardState = useCallback(() => elementsRef.current, []);

  // Realtime multi-user collaboration hook (Socket.io)
  const {
    currentUser,
    activeUsers,
    remoteCursors,
    isConnected,
    broadcast,
    sendCursorPosition
  } = useCollaboration({
    onRemoteAction: handleRemoteAction,
    getBoardState
  });

  // Undo / Redo actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevElements = history[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      setElements(prevElements);
      broadcast('SYNC_BOARD_STATE', prevElements);
    }
  }, [historyIndex, history, broadcast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextElements = history[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      setElements(nextElements);
      broadcast('SYNC_BOARD_STATE', nextElements);
    }
  }, [historyIndex, history, broadcast]);

  // Clear Canvas
  const handleClearBoard = useCallback(() => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua goresan dan catatan di kanvas?')) {
      const emptyBoard = { strokes: [], stickies: [], texts: [] };
      updateElementsWithHistory(emptyBoard);
      broadcast('CLEAR_BOARD');
    }
  }, [updateElementsWithHistory, broadcast]);

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.2, 3.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z * 0.8, 0.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleResetZoom]);

  return (
    <div className="whiteboard-app-root">
      {/* 1. KIRI ATAS: Website name & KANAN ATAS: Jumlah orang & tombol share board */}
      <Navbar
        siteName="CollabFlow"
        activeUsers={activeUsers}
        currentUser={currentUser}
        isConnected={isConnected}
        onOpenShare={() => setIsShareModalOpen(true)}
      />

      {/* 2. TENGAH KIRI: Pulpen, Text, Sticky Note, Shapes, Eraser, Color picker */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        stickyColor={stickyColor}
        setStickyColor={setStickyColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onClearBoard={handleClearBoard}
      />

      {/* 3. KANAN BAWAH: Tombol Zoom In & Zoom Out */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* 4. BOARD CANVAS: Interaktif dengan zoom in/out scroll wheel & realtime collab */}
      <WhiteboardCanvas
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        currentColor={currentColor}
        strokeWidth={strokeWidth}
        stickyColor={stickyColor}
        zoom={zoom}
        setZoom={setZoom}
        pan={pan}
        setPan={setPan}
        elements={elements}
        setElements={setElements}
        onSaveElements={updateElementsWithHistory}
        broadcast={broadcast}
        sendCursorPosition={sendCursorPosition}
        remoteCursors={remoteCursors}
      />

      {/* Share Board Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activeUsersCount={activeUsers.length}
      />
    </div>
  );
}
