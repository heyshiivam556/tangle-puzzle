import React, { useRef, useMemo } from 'react';
import { generateBuiltinImage, BUILTIN_IMAGES } from '../utils/puzzleGenerator.js';

const PIECE_OPTIONS = [
  { count: 24, label: 'Medium' },
  { count: 48, label: 'Hard' },
  { count: 80, label: 'Extreme' },
];

export default function GameSettings({
  isHost,
  imageUrl,
  imageIndex,
  pieceCount,
  players,
  onSelectImage,
  onUploadImage,
  onPieceCountChange,
  onStart,
}) {
  const fileRef = useRef(null);

  // Pre-generate thumbnails for built-in images
  const thumbnails = useMemo(
    () => BUILTIN_IMAGES.map((_, i) => generateBuiltinImage(i, 200, 150)),
    [],
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new window.Image();
      img.onload = () => onUploadImage(dataUrl, img.width, img.height);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="settings-panel">
      {/* ---- Image selection ---- */}
      <div className="settings-section">
        <h3>Choose an Image</h3>
        <div className="image-grid">
          {thumbnails.map((thumb, i) => (
            <div
              key={i}
              className={`image-option${imageIndex === i ? ' selected' : ''}`}
              onClick={() => isHost && onSelectImage(i)}
              style={{ cursor: isHost ? 'pointer' : 'default' }}
            >
              <img src={thumb} alt={BUILTIN_IMAGES[i]?.name ?? `Image ${i + 1}`} />
              <span className="image-option-label">
                {BUILTIN_IMAGES[i]?.name ?? `Image ${i + 1}`}
              </span>
            </div>
          ))}

          {/* Upload option */}
          <div
            className="image-option upload-option"
            onClick={() => isHost && fileRef.current?.click()}
            style={{ cursor: isHost ? 'pointer' : 'default' }}
          >
            <span>📁 Upload</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* ---- Piece count ---- */}
      <div className="settings-section">
        <h3>Number of Pieces</h3>
        <div className="piece-count-options">
          {PIECE_OPTIONS.map((opt) => (
            <div
              key={opt.count}
              className={`piece-count-option${pieceCount === opt.count ? ' selected' : ''}`}
              onClick={() => isHost && onPieceCountChange(opt.count)}
              style={{ cursor: isHost ? 'pointer' : 'default' }}
            >
              <span className="count">{opt.count}</span>
              <span className="label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Image preview ---- */}
      {imageUrl && (
        <div className="settings-section">
          <h3>Preview</h3>
          <div className="image-preview">
            <img src={imageUrl} alt="Selected" />
          </div>
        </div>
      )}

      {/* ---- Start button ---- */}
      {isHost && (
        <div className="settings-actions">
          <button
            className="btn btn-accent"
            onClick={onStart}
            disabled={!imageUrl}
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
}
