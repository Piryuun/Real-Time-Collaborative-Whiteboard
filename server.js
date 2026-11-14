import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Global persistent board state in memory
let boardState = {
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
      text: '✨ Selamat Datang!\n\n• Gambar bebas dengan pulpen atau buat bentuk\n• Teks & Sticky notes tersinkronisasi realtime!\n• Multi-user Socket.io aktif 🚀'
    },
    {
      id: 'sticky_welcome_2',
      x: 650,
      y: 220,
      width: 200,
      height: 180,
      color: '#BAE6FD',
      borderColor: '#38BDF8',
      text: '💡 Kolaborasi Realtime\n\nBuka whiteboard ini di browser, perangkat, atau tab lain untuk menggambar bersama secara langsung tanpa perlu refresh!'
    }
  ],
  texts: [
    {
      id: 'text_title_demo',
      x: 380,
      y: 150,
      color: '#3B82F6',
      text: '🚀 Realtime Collaborative Whiteboard (Socket.io)'
    }
  ]
};

// Connected active users map: socketId -> user profile
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.io] New client connected: ${socket.id}`);

  // User announces presence
  socket.on('join_room', (user) => {
    const userProfile = {
      ...user,
      socketId: socket.id,
      joinedAt: Date.now()
    };
    activeUsers.set(socket.id, userProfile);

    // 1. Send the existing board state to the new user immediately
    socket.emit('init_board', boardState);

    // 2. Broadcast updated active users list to everyone
    const usersList = Array.from(activeUsers.values());
    io.emit('active_users', usersList);

    // 3. Notify other users about this user
    socket.broadcast.emit('user_joined', userProfile);

    console.log(`[Socket.io] User joined: ${user.name} (${socket.id}). Online: ${activeUsers.size}`);
  });

  // Live Cursor Movement
  socket.on('cursor_move', (coords) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('cursor_move', {
        userId: user.id,
        name: user.name,
        color: user.color,
        x: coords.x,
        y: coords.y
      });
    }
  });

  // Stroke / Shape Drawing
  socket.on('draw_stroke', (stroke) => {
    boardState.strokes.push(stroke);
    socket.broadcast.emit('draw_stroke', stroke);
  });

  // Sync strokes (e.g. after erasing)
  socket.on('sync_strokes', (strokes) => {
    boardState.strokes = strokes;
    socket.broadcast.emit('sync_strokes', strokes);
  });

  // Sticky Notes
  socket.on('add_sticky', (sticky) => {
    boardState.stickies.push(sticky);
    socket.broadcast.emit('add_sticky', sticky);
  });

  socket.on('update_sticky', (sticky) => {
    const index = boardState.stickies.findIndex((s) => s.id === sticky.id);
    if (index !== -1) {
      boardState.stickies[index] = { ...boardState.stickies[index], ...sticky };
    } else {
      boardState.stickies.push(sticky);
    }
    socket.broadcast.emit('update_sticky', sticky);
  });

  socket.on('delete_sticky', ({ id }) => {
    boardState.stickies = boardState.stickies.filter((s) => s.id !== id);
    socket.broadcast.emit('delete_sticky', { id });
  });

  // Text Elements
  socket.on('add_text', (textItem) => {
    boardState.texts.push(textItem);
    socket.broadcast.emit('add_text', textItem);
  });

  socket.on('update_text', (textItem) => {
    const index = boardState.texts.findIndex((t) => t.id === textItem.id);
    if (index !== -1) {
      boardState.texts[index] = { ...boardState.texts[index], ...textItem };
    } else {
      boardState.texts.push(textItem);
    }
    socket.broadcast.emit('update_text', textItem);
  });

  socket.on('delete_text', ({ id }) => {
    boardState.texts = boardState.texts.filter((t) => t.id !== id);
    socket.broadcast.emit('delete_text', { id });
  });

  // Clear Board
  socket.on('clear_board', () => {
    boardState = { strokes: [], stickies: [], texts: [] };
    io.emit('clear_board');
  });

  // Full state sync (Undo / Redo)
  socket.on('sync_board_state', (newState) => {
    boardState = newState;
    socket.broadcast.emit('init_board', boardState);
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    activeUsers.delete(socket.id);

    if (user) {
      io.emit('user_left', { userId: user.id });
      const usersList = Array.from(activeUsers.values());
      io.emit('active_users', usersList);
      console.log(`[Socket.io] User left: ${user.name} (${socket.id}). Online: ${activeUsers.size}`);
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Realtime Whiteboard Socket.io Server',
    onlineUsers: activeUsers.size
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Socket.io Server is running on http://0.0.0.0:${PORT}`);
});
