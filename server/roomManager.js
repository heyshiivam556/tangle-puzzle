const rooms = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function createRoom(socketId, playerName) {
  let code;
  do {
    code = generateCode();
  } while (rooms.has(code));

  const room = {
    code,
    players: [{ id: socketId, name: playerName }],
    settings: null,
    gameState: null,
    imageData: null,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code, socketId, playerName) {
  const room = rooms.get(code);
  if (!room) {
    return { error: 'Room not found' };
  }
  if (room.players.length >= 2) {
    return { error: 'Room is full' };
  }
  if (room.players.some((p) => p.id === socketId)) {
    return { error: 'Already in this room' };
  }

  room.players.push({ id: socketId, name: playerName });
  return { room };
}

export function getRoom(code) {
  return rooms.get(code) || null;
}

export function getRoomByPlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) {
      return room;
    }
  }
  return null;
}

export function removePlayer(socketId) {
  for (const [code, room] of rooms.entries()) {
    const idx = room.players.findIndex((p) => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        rooms.delete(code);
        return { room, deleted: true };
      }
      return { room, deleted: false };
    }
  }
  return { room: null, deleted: false };
}

export function setGameSettings(code, settings) {
  const room = rooms.get(code);
  if (room) {
    room.settings = settings;
  }
  return room;
}

export function setGameState(code, gameState) {
  const room = rooms.get(code);
  if (room) {
    room.gameState = gameState;
  }
  return room;
}
