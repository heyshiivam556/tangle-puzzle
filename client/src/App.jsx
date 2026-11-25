import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { generateBuiltinImage, getGridDimensions } from './utils/puzzleGenerator';
import { playCheer } from './utils/soundEffects';
import Lobby from './components/Lobby';
import GameSettings from './components/GameSettings';
import PuzzleBoard from './components/PuzzleBoard';
import HUD from './components/HUD';
import VictoryScreen from './components/VictoryScreen';

export default function App() {
  // --- State ---
  const [screen, setScreen] = useState('lobby'); // lobby | settings | game | victory
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [pieceCount, setPieceCount] = useState(48);
  const [victoryData, setVictoryData] = useState(null);
  const [disconnected, setDisconnected] = useState(false);

  // --- Refs ---
  const socketRef = useRef(null);

  // --- Socket setup (once on mount) ---
  useEffect(() => {
    // In production, connect to window.location.origin (if served together) or VITE_SERVER_URL
    const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');
    const socket = io(serverUrl);
    socketRef.current = socket;

    // --- Server → Client events ---

    socket.on('room-created', ({ roomCode: code, playerId: pid }) => {
      setRoomCode(code);
      setPlayerId(pid);
      setIsHost(true);
    });

    socket.on('room-joined', ({ roomCode: code, playerId: pid }) => {
      setRoomCode(code);
      setPlayerId(pid);
    });

    socket.on('join-error', ({ error }) => {
      alert(error);
    });

    socket.on('player-joined', ({ players: pl }) => {
      setPlayers(pl);
      if (pl.length >= 2) {
        setScreen('settings');
      }
    });

    socket.on('settings-updated', ({ settings }) => {
      if (settings.imageIndex != null) {
        setImageIndex(settings.imageIndex);
      }
      if (settings.pieceCount != null) {
        setPieceCount(settings.pieceCount);
      }
      // If the settings include a built-in image index, regenerate the preview
      if (settings.imageIndex != null && settings.imageIndex >= 0) {
        const url = generateBuiltinImage(settings.imageIndex);
        setImageUrl(url);
      }
    });

    socket.on('image-shared', ({ imageData }) => {
      setImageUrl(imageData);
    });

    socket.on('game-started', (gs) => {
      setGameState(gs);
      setScreen('game');
    });

    socket.on('piece-placed', ({ placedCount }) => {
      setGameState((prev) => prev ? { ...prev, placedCount } : prev);
    });

    socket.on('game-complete', (data) => {
      setVictoryData(data);
      setScreen('victory');
      playCheer();
    });

    socket.on('player-disconnected', ({ playerId: pid }) => {
      setDisconnected(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- Handlers ---

  const handleHost = useCallback((name) => {
    setPlayerName(name);
    socketRef.current?.emit('create-room', name);
  }, []);

  const handleJoin = useCallback((code, name) => {
    setPlayerName(name);
    socketRef.current?.emit('join-room', { roomCode: code, playerName: name });
  }, []);

  const handleSelectImage = useCallback(
    (index) => {
      const url = generateBuiltinImage(index);
      setImageUrl(url);
      setImageIndex(index);

      const { rows, cols } = getGridDimensions(pieceCount);
      socketRef.current?.emit('game-settings', {
        roomCode,
        settings: {
          imageIndex: index,
          pieceCount,
          imageWidth: 800,
          imageHeight: 600,
          rows,
          cols,
        },
      });
      socketRef.current?.emit('share-image', { roomCode, imageData: url });
    },
    [roomCode, pieceCount]
  );

  const handleUploadImage = useCallback(
    (dataUrl, width, height) => {
      setImageUrl(dataUrl);
      setImageIndex(null);

      const { rows, cols } = getGridDimensions(pieceCount);
      socketRef.current?.emit('share-image', { roomCode, imageData: dataUrl });
      socketRef.current?.emit('game-settings', {
        roomCode,
        settings: {
          imageIndex: null,
          pieceCount,
          imageWidth: width || 800,
          imageHeight: height || 600,
          rows,
          cols,
        },
      });
    },
    [roomCode, pieceCount]
  );

  const handlePieceCountChange = useCallback(
    (count) => {
      setPieceCount(count);

      const { rows, cols } = getGridDimensions(count);
      socketRef.current?.emit('game-settings', {
        roomCode,
        settings: {
          imageIndex,
          pieceCount: count,
          imageWidth: 800,
          imageHeight: 600,
          rows,
          cols,
        },
      });
    },
    [roomCode, imageIndex]
  );

  const handleStartGame = useCallback(() => {
    socketRef.current?.emit('start-game', { roomCode });
  }, [roomCode]);

  const handlePlayAgain = useCallback(() => {
    // Keep room + players, go back to settings to pick a new image
    setGameState(null);
    setVictoryData(null);
    setDisconnected(false);
    setScreen('settings');
  }, []);

  // --- Render ---

  return (
    <div className="app">
      {screen === 'lobby' && (
        <Lobby onHost={handleHost} onJoin={handleJoin} roomCode={roomCode} players={players} />
      )}

      {screen === 'settings' && (
        <GameSettings
          roomCode={roomCode}
          isHost={isHost}
          imageUrl={imageUrl}
          imageIndex={imageIndex}
          pieceCount={pieceCount}
          players={players}
          onSelectImage={handleSelectImage}
          onUploadImage={handleUploadImage}
          onPieceCountChange={handlePieceCountChange}
          onStart={handleStartGame}
        />
      )}

      {screen === 'game' && gameState && (
        <div className="puzzle-container">
          <PuzzleBoard
            socket={socketRef.current}
            roomCode={roomCode}
            playerId={playerId}
            gameState={gameState}
            imageUrl={imageUrl}
            players={players}
          />
          <HUD
            placedCount={gameState.placedCount}
            totalPieces={gameState.pieces.length}
            startTime={gameState.startTime}
            players={players}
            playerId={playerId}
          />
        </div>
      )}

      {screen === 'victory' && victoryData && (
        <VictoryScreen time={victoryData.time} stats={victoryData.stats} onPlayAgain={handlePlayAgain} />
      )}

      {disconnected && (
        <div className="disconnect-overlay">
          <div className="disconnect-card">
            <h2>Player Disconnected</h2>
            <p>The other player has left the game.</p>
            <button className="btn btn-accent" onClick={handlePlayAgain}>
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
