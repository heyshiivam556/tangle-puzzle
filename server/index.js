import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomByPlayer,
  removePlayer,
  setGameSettings,
  setGameState,
} from './roomManager.js';

import { generatePuzzle } from './gameState.js';

const app = express();
app.use(cors());

// Health check endpoint (used for keep-alive pings and status checks)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10e6, // 10 MB for image transfers
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Create Room ──────────────────────────────────────────────
  socket.on('create-room', (playerName) => {
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit('room-created', { roomCode: room.code, playerId: socket.id });
    console.log(`[room-created] ${room.code} by "${playerName}" (${socket.id})`);
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName }) => {
    const result = joinRoom(roomCode, socket.id, playerName);

    if (result.error) {
      socket.emit('join-error', { error: result.error });
      return;
    }

    const room = result.room;
    socket.join(room.code);
    socket.emit('room-joined', { roomCode: room.code, playerId: socket.id });

    // Notify everyone in the room about the updated player list
    io.to(room.code).emit('player-joined', { players: room.players });

    // Send current settings to the joining player if they exist
    if (room.settings) {
      socket.emit('settings-updated', { settings: room.settings });
    }

    // Send current image to the joining player if it exists
    if (room.imageData) {
      socket.emit('image-shared', { imageData: room.imageData });
    }

    console.log(`[room-joined] ${room.code} by "${playerName}" (${socket.id})`);
  });

  // ── Game Settings ────────────────────────────────────────────
  socket.on('game-settings', ({ roomCode, settings }) => {
    setGameSettings(roomCode, settings);
    // Broadcast settings to everyone in the room (including sender)
    io.to(roomCode).emit('settings-updated', { settings });
  });

  // ── Share Image ──────────────────────────────────────────────
  socket.on('share-image', ({ roomCode, imageData }) => {
    const room = getRoom(roomCode);
    if (room) {
      room.imageData = imageData;
    }
    // Broadcast the image to all OTHER players in the room
    socket.to(roomCode).emit('image-shared', { imageData });
  });

  // ── Start Game ───────────────────────────────────────────────
  socket.on('start-game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.settings) return;

    const gameState = generatePuzzle(room.settings);
    setGameState(roomCode, gameState);

    io.to(roomCode).emit('game-started', {
      pieces: gameState.pieces,
      worldWidth: gameState.worldWidth,
      worldHeight: gameState.worldHeight,
      boardX: gameState.boardX,
      boardY: gameState.boardY,
      imageWidth: gameState.imageWidth,
      imageHeight: gameState.imageHeight,
      rows: gameState.rows,
      cols: gameState.cols,
      startTime: gameState.startTime,
      placedCount: gameState.placedCount,
    });

    console.log(
      `[game-started] ${roomCode} — ${gameState.pieces.length} pieces (${room.settings.cols}x${room.settings.rows})`
    );
  });

  // ── Piece Grabbed ────────────────────────────────────────────
  socket.on('piece-grabbed', ({ roomCode, pieceId }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const piece = room.gameState.pieces.find((p) => p.id === pieceId);
    if (!piece || piece.placed || piece.grabbedBy) return;

    piece.grabbedBy = socket.id;
    socket.to(roomCode).emit('piece-grabbed', { pieceId, playerId: socket.id });
  });

  // ── Piece Moved ──────────────────────────────────────────────
  socket.on('piece-moved', ({ roomCode, pieceId, x, y }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const piece = room.gameState.pieces.find((p) => p.id === pieceId);
    if (!piece || piece.grabbedBy !== socket.id) return;

    piece.currentX = x;
    piece.currentY = y;
    socket.to(roomCode).emit('piece-moved', { pieceId, x, y });
  });

  // ── Piece Dropped ────────────────────────────────────────────
  socket.on('piece-dropped', ({ roomCode, pieceId, x, y }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const piece = room.gameState.pieces.find((p) => p.id === pieceId);
    if (!piece || piece.grabbedBy !== socket.id) return;

    piece.currentX = x;
    piece.currentY = y;
    piece.grabbedBy = null;
    socket.to(roomCode).emit('piece-dropped', { pieceId, x, y });
  });

  // ── Piece Placed (snapped to correct position) ───────────────
  socket.on('piece-placed', ({ roomCode, pieceId }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const piece = room.gameState.pieces.find((p) => p.id === pieceId);
    if (!piece || piece.placed) return;

    // Find the player who placed it
    const player = room.players.find((p) => p.id === socket.id);
    const playerName = player ? player.name : 'Unknown';

    piece.placed = true;
    piece.placedBy = socket.id;
    piece.grabbedBy = null;
    piece.currentX = piece.correctX;
    piece.currentY = piece.correctY;
    room.gameState.placedCount++;

    io.to(roomCode).emit('piece-placed', {
      pieceId,
      playerId: socket.id,
      playerName,
      x: piece.correctX,
      y: piece.correctY,
      placedCount: room.gameState.placedCount,
    });

    // Check for game completion
    if (room.gameState.placedCount >= room.gameState.pieces.length) {
      const elapsed = Date.now() - room.gameState.startTime;

      // Build per-player stats
      const stats = {};
      for (const p of room.players) {
        stats[p.id] = {
          name: p.name,
          count: room.gameState.pieces.filter((pc) => pc.placedBy === p.id).length,
        };
      }

      io.to(roomCode).emit('game-complete', { time: elapsed, stats });
      console.log(`[game-complete] ${roomCode} in ${(elapsed / 1000).toFixed(1)}s`);
    }
  });

  // ── Cursor Move ──────────────────────────────────────────────
  socket.on('cursor-move', ({ roomCode, x, y }) => {
    socket.to(roomCode).emit('cursor-move', { playerId: socket.id, x, y });
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);

    // Find the room this player was in
    const room = getRoomByPlayer(socket.id);

    if (room && room.gameState) {
      // Ungrab any pieces held by the disconnected player
      for (const piece of room.gameState.pieces) {
        if (piece.grabbedBy === socket.id) {
          piece.grabbedBy = null;
        }
      }
    }

    if (room) {
      // Notify remaining players
      socket.to(room.code).emit('player-disconnected', { playerId: socket.id });
    }

    // Remove the player from the room (and delete room if empty)
    removePlayer(socket.id);
  });
});

// Serve client build if available (production mode / unified deployment)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`TanglePuzzle server listening on port ${PORT}`);
});
