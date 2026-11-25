import React from 'react';

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const DOT_COLORS = ['#4fc3f7', '#ff8a65', '#ce93d8', '#a5d6a7'];

export default function VictoryScreen({ time, stats, onPlayAgain }) {
  const statEntries = Object.entries(stats); // [playerId, { name, count }]

  return (
    <div className="victory-overlay">
      <div className="victory-card">
        <h1>🎉 Puzzle Complete!</h1>

        <div className="victory-time">
          {formatTime(time)}
        </div>

        <div className="victory-stats">
          {statEntries.map(([id, { name, count }], i) => (
            <div key={id} className="stat-card">
              <div className="stat-name">
                <span
                  className="player-dot"
                  style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}
                />
                {name}
              </div>
              <div className="stat-value">
                {count} piece{count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-accent" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}
