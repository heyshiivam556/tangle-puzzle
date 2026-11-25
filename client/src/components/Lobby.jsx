import React, { useState } from 'react';

export default function Lobby({ onHost, onJoin, roomCode, players, isHost, isConnected = true }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleHost = () => {
    if (name.trim()) onHost(name.trim());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim() && code.trim()) onJoin(code.trim().toUpperCase(), name.trim());
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // --- In-room view ---
  if (roomCode) {
    return (
      <div className="lobby">
        <div className="room-info">
          <h2>Room Created</h2>
          <div className="room-code-display" onClick={copyCode} title="Click to copy">
            {roomCode}
          </div>
          <p className="room-code-hint">
            {copied ? 'Copied!' : 'Click to copy room code'}
          </p>

          <div className="players-list">
            {players.map((p, i) => (
              <div key={p.id} className="player-badge">
                <span
                  className="player-dot"
                  style={{ background: i === 0 ? '#4fc3f7' : '#ff8a65' }}
                />
                {p.name}
              </div>
            ))}
          </div>

          {players.length < 2 && (
            <p className="waiting-text">Waiting for another player…</p>
          )}
        </div>
      </div>
    );
  }

  // --- Join form sub-view ---
  if (showJoin) {
    return (
      <div className="lobby">
        <h1>🧩 TanglePuzzle</h1>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
          />
          <input
            type="text"
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <div className="lobby-actions">
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || !code.trim()}>
              Join
            </button>
            <button type="button" className="btn" onClick={() => setShowJoin(false)}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Default landing view ---
  return (
    <div className="lobby">
      <h1>🧩 TanglePuzzle</h1>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={16}
      />
      <div className="lobby-actions">
        <button
          className="btn btn-accent"
          onClick={handleHost}
          disabled={!name.trim() || !isConnected}
        >
          Host Room
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setShowJoin(true)}
          disabled={!name.trim() || !isConnected}
        >
          Join Room
        </button>
      </div>

      {!isConnected && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#ffb74d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffb74d', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          Waking up server... (takes ~30s if idle)
        </div>
      )}
    </div>
  );
}
