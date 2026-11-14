import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'
];

const NAMES = [
  'Alex Rivera', 'Maya Chen', 'Liam Tanaka', 'Zara Patel', 
  'Leo Martinez', 'Chloe Dubois', 'Noah Kim', 'Samira Khan'
];

function getRandomUser() {
  const randIndex = Math.floor(Math.random() * NAMES.length);
  return {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: NAMES[randIndex],
    color: COLORS[randIndex % COLORS.length]
  };
}

export function useCollaboration({ onRemoteAction, getBoardState }) {
  const [currentUser] = useState(() => {
    const saved = sessionStorage.getItem('collab_whiteboard_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const newUser = getRandomUser();
    sessionStorage.setItem('collab_whiteboard_user', JSON.stringify(newUser));
    return newUser;
  });

  const [activeUsers, setActiveUsers] = useState([currentUser]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const channelRef = useRef(null);
  const lastCursorSentRef = useRef(0);

  // Broadcast an action to all other collaborators via Socket.io
  const broadcast = useCallback((type, payload = {}) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      switch (type) {
        case 'ADD_STROKE':
          socket.emit('draw_stroke', payload);
          break;
        case 'SYNC_STROKES':
          socket.emit('sync_strokes', payload.strokes);
          break;
        case 'ADD_STICKY':
          socket.emit('add_sticky', payload);
          break;
        case 'UPDATE_STICKY':
          socket.emit('update_sticky', payload);
          break;
        case 'DELETE_STICKY':
          socket.emit('delete_sticky', payload);
          break;
        case 'ADD_TEXT':
          socket.emit('add_text', payload);
          break;
        case 'UPDATE_TEXT':
          socket.emit('update_text', payload);
          break;
        case 'DELETE_TEXT':
          socket.emit('delete_text', payload);
          break;
        case 'CLEAR_BOARD':
          socket.emit('clear_board');
          break;
        case 'SYNC_BOARD_STATE':
          socket.emit('sync_board_state', payload);
          break;
        default:
          break;
      }
    }

    // Secondary BroadcastChannel fallback for instant multi-tab sync
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type,
          sender: currentUser,
          timestamp: Date.now(),
          payload
        });
      } catch (err) {
        console.warn('BroadcastChannel failed', err);
      }
    }
  }, [currentUser]);

  // Connect to Socket.io server
  useEffect(() => {
    // Determine socket server host
    const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL ||
      (window.location.port === '5173'
        ? `http://${window.location.hostname}:3001`
        : window.location.origin);

    console.log(`[Socket.io] Connecting to ${socketUrl}...`);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket.io] Connected! Socket ID: ${socket.id}`);
      setIsConnected(true);
      // Join room with user profile
      socket.emit('join_room', currentUser);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.io] Connect error (is server.js running?):', error.message);
      setIsConnected(false);
    });

    // Receive initial board state when joining (no refresh needed)
    socket.on('init_board', (boardState) => {
      console.log('[Socket.io] Received initial board state from server');
      if (onRemoteAction) {
        onRemoteAction('INIT_BOARD', boardState);
      }
    });

    // Receive active users list
    socket.on('active_users', (usersList) => {
      if (Array.isArray(usersList) && usersList.length > 0) {
        setActiveUsers(usersList);
      }
    });

    // User left
    socket.on('user_left', ({ userId }) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    // Remote cursor movements
    socket.on('cursor_move', (cursorData) => {
      if (cursorData.userId === currentUser.id) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [cursorData.userId]: {
          id: cursorData.userId,
          name: cursorData.name,
          color: cursorData.color,
          x: cursorData.x,
          y: cursorData.y,
          lastSeen: Date.now()
        }
      }));
    });

    // Remote drawings & shapes
    socket.on('draw_stroke', (stroke) => {
      if (onRemoteAction) onRemoteAction('ADD_STROKE', stroke);
    });

    socket.on('sync_strokes', (strokes) => {
      if (onRemoteAction) onRemoteAction('SYNC_STROKES', { strokes });
    });

    // Remote sticky notes
    socket.on('add_sticky', (sticky) => {
      if (onRemoteAction) onRemoteAction('ADD_STICKY', sticky);
    });

    socket.on('update_sticky', (sticky) => {
      if (onRemoteAction) onRemoteAction('UPDATE_STICKY', sticky);
    });

    socket.on('delete_sticky', ({ id }) => {
      if (onRemoteAction) onRemoteAction('DELETE_STICKY', { id });
    });

    // Remote texts
    socket.on('add_text', (textItem) => {
      if (onRemoteAction) onRemoteAction('ADD_TEXT', textItem);
    });

    socket.on('update_text', (textItem) => {
      if (onRemoteAction) onRemoteAction('UPDATE_TEXT', textItem);
    });

    socket.on('delete_text', ({ id }) => {
      if (onRemoteAction) onRemoteAction('DELETE_TEXT', { id });
    });

    // Remote clear board
    socket.on('clear_board', () => {
      if (onRemoteAction) onRemoteAction('CLEAR_BOARD');
    });

    // Setup local BroadcastChannel as fallback
    const channel = new BroadcastChannel('realtime_whiteboard_channel');
    channelRef.current = channel;

    const handleChannelMessage = (event) => {
      // If socket is connected, server handles broadcasting
      if (socket.connected) return;

      const { type, sender, payload } = event.data || {};
      if (!sender || sender.id === currentUser.id) return;

      if (type === 'CURSOR_MOVE') {
        setRemoteCursors((prev) => ({
          ...prev,
          [sender.id]: {
            ...sender,
            x: payload.x,
            y: payload.y,
            lastSeen: Date.now()
          }
        }));
      } else if (onRemoteAction) {
        onRemoteAction(type, payload, sender);
      }
    };

    channel.addEventListener('message', handleChannelMessage);

    return () => {
      channel.removeEventListener('message', handleChannelMessage);
      channel.close();
      socket.disconnect();
    };
  }, [currentUser, onRemoteAction]);

  // Throttled cursor position sender
  const sendCursorPosition = useCallback((x, y) => {
    const now = Date.now();
    if (now - lastCursorSentRef.current > 35) { // ~30 fps is ideal for realtime cursors
      lastCursorSentRef.current = now;
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('cursor_move', { x, y });
      } else if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'CURSOR_MOVE',
          sender: currentUser,
          payload: { x, y }
        });
      }
    }
  }, [currentUser]);

  return {
    currentUser,
    activeUsers,
    remoteCursors,
    isConnected,
    broadcast,
    sendCursorPosition
  };
}
