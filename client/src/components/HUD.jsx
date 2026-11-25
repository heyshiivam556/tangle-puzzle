import React, { useState, useEffect } from 'react';

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function HUD({ placedCount, totalPieces, startTime, players, playerId }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const pct = totalPieces > 0 ? Math.round((placedCount / totalPieces) * 100) : 0;

  return (
    <div className="hud">
      <div className="hud-top">
        {/* Timer */}
        <div className="hud-pill hud-timer">
          ⏱ {formatTime(elapsed)}
        </div>

        {/* Counter + progress */}
        <div className="hud-pill hud-counter">
          <span>{placedCount} / {totalPieces}</span>
          <div className="hud-progress">
            <div
              className="hud-progress-bar"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Player badges */}
        <div className="hud-pill hud-players">
          {players.map((p, i) => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                className="player-dot"
                style={{ background: i === 0 ? '#4fc3f7' : '#ff8a65' }}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
