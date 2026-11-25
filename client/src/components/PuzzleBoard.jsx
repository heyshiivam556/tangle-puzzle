import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group, Circle, Text } from 'react-konva';
import useImage from 'use-image';
import { playSnap, playGrab, warmUpAudio } from '../utils/soundEffects';

export default function PuzzleBoard({
  socket,
  roomCode,
  playerId,
  players,
  gameState,
  imageUrl,
}) {
  // ---- State ----
  const [pieces, setPieces] = useState(() =>
    gameState.pieces.map((p) => ({ ...p })),
  );
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [otherCursor, setOtherCursor] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [showRefImage, setShowRefImage] = useState(true);

  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const moveThrottleRef = useRef(0);
  const cursorThrottleRef = useRef(0);
  const initialScaleRef = useRef(null);
  const initialPosRef = useRef(null);

  const {
    worldWidth,
    worldHeight,
    boardX,
    boardY,
    imageWidth,
    imageHeight,
    rows,
    cols,
  } = gameState;

  // ---- Image loading ----
  const [image] = useImage(imageUrl);

  // ---- Container measurement ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setContainerSize({ width, height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Compute initial scale & position whenever container or world changes ----
  useEffect(() => {
    const { width: cw, height: ch } = containerSize;
    const scale = Math.min(cw / worldWidth, ch / worldHeight) * 0.9;
    const pos = {
      x: (cw - worldWidth * scale) / 2,
      y: (ch - worldHeight * scale) / 2,
    };
    initialScaleRef.current = scale;
    initialPosRef.current = pos;
    setStageScale(scale);
    setStagePos(pos);
  }, [containerSize, worldWidth, worldHeight]);

  // ---- Socket listeners ----
  useEffect(() => {
    if (!socket) return;

    const onPieceGrabbed = ({ pieceId, playerId: grabber }) => {
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, grabbedBy: grabber } : p)),
      );
    };

    const onPieceMoved = ({ pieceId, x, y }) => {
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId ? { ...p, currentX: x, currentY: y } : p,
        ),
      );
    };

    const onPieceDropped = ({ pieceId, x, y }) => {
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? { ...p, currentX: x, currentY: y, grabbedBy: null }
            : p,
        ),
      );
    };

    const onPiecePlaced = ({ pieceId, playerId: placer, x, y }) => {
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? {
                ...p,
                currentX: p.correctX,
                currentY: p.correctY,
                placed: true,
                placedBy: placer,
                grabbedBy: null,
              }
            : p,
        ),
      );
    };

    const onCursorMove = ({ x, y }) => {
      setOtherCursor({ x, y });
    };

    socket.on('piece-grabbed', onPieceGrabbed);
    socket.on('piece-moved', onPieceMoved);
    socket.on('piece-dropped', onPieceDropped);
    socket.on('piece-placed', onPiecePlaced);
    socket.on('cursor-move', onCursorMove);

    return () => {
      socket.off('piece-grabbed', onPieceGrabbed);
      socket.off('piece-moved', onPieceMoved);
      socket.off('piece-dropped', onPieceDropped);
      socket.off('piece-placed', onPiecePlaced);
      socket.off('cursor-move', onCursorMove);
    };
  }, [socket]);

  // ---- Zoom helpers ----
  const clampScale = (s) => Math.min(3.0, Math.max(0.3, s));

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = stageScale;
      // Use a gentle zoom factor (1.02) so touchpad pinch isn't too sensitive
      const zoomFactor = 1.02;
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const newScale = clampScale(
        direction > 0 ? oldScale * zoomFactor : oldScale / zoomFactor,
      );

      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [stageScale, stagePos],
  );

  const zoomIn = useCallback(() => {
    const { width: cw, height: ch } = containerSize;
    const newScale = clampScale(stageScale * 1.3);
    setStageScale(newScale);
    setStagePos({
      x: cw / 2 - (worldWidth / 2) * newScale,
      y: ch / 2 - (worldHeight / 2) * newScale,
    });
  }, [stageScale, containerSize, worldWidth, worldHeight]);

  const zoomOut = useCallback(() => {
    const { width: cw, height: ch } = containerSize;
    const newScale = clampScale(stageScale / 1.3);
    setStageScale(newScale);
    setStagePos({
      x: cw / 2 - (worldWidth / 2) * newScale,
      y: ch / 2 - (worldHeight / 2) * newScale,
    });
  }, [stageScale, containerSize, worldWidth, worldHeight]);

  const zoomReset = useCallback(() => {
    if (initialScaleRef.current != null) {
      setStageScale(initialScaleRef.current);
      setStagePos(initialPosRef.current);
    }
  }, []);

  // ---- Piece drag handlers ----
  const handleDragStart = useCallback(
    (pieceId) => {
      if (!socket) return;
      socket.emit('piece-grabbed', { roomCode, pieceId });
      playGrab();
    },
    [socket, roomCode],
  );

  const handleDragMove = useCallback(
    (pieceId, e) => {
      if (!socket) return;
      const now = Date.now();
      if (now - moveThrottleRef.current < 30) return;
      moveThrottleRef.current = now;

      const x = e.target.x();
      const y = e.target.y();
      socket.emit('piece-moved', { roomCode, pieceId, x, y });
    },
    [socket, roomCode],
  );

  const handleDragEnd = useCallback(
    (pieceId, e) => {
      if (!socket) return;
      const x = e.target.x();
      const y = e.target.y();

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const dx = x - piece.correctX;
      const dy = y - piece.correctY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        // Snap
        playSnap();
        socket.emit('piece-placed', { roomCode, pieceId });
        setPieces((prev) =>
          prev.map((p) =>
            p.id === pieceId
              ? {
                  ...p,
                  currentX: p.correctX,
                  currentY: p.correctY,
                  placed: true,
                  grabbedBy: null,
                }
              : p,
          ),
        );
        // Also snap the Konva node visually
        e.target.position({ x: piece.correctX, y: piece.correctY });
      } else {
        socket.emit('piece-dropped', { roomCode, pieceId, x, y });
        setPieces((prev) =>
          prev.map((p) =>
            p.id === pieceId
              ? { ...p, currentX: x, currentY: y, grabbedBy: null }
              : p,
          ),
        );
      }
    },
    [socket, roomCode, pieces],
  );

  // ---- Mouse move for cursor sync ----
  const handleMouseMove = useCallback(
    (e) => {
      if (!socket) return;
      const now = Date.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;

      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldX = (pointer.x - stagePos.x) / stageScale;
      const worldY = (pointer.y - stagePos.y) / stageScale;
      socket.emit('cursor-move', { roomCode, x: worldX, y: worldY });
    },
    [socket, roomCode, stageScale, stagePos],
  );

  // ---- Sort pieces: placed behind, unplaced on top ----
  const sortedPieces = [...pieces].sort((a, b) => {
    if (a.placed === b.placed) return 0;
    return a.placed ? -1 : 1;
  });

  // ---- Other player info ----
  const otherPlayer = players.find((p) => p.id !== playerId);
  const myIndex = players.findIndex((p) => p.id === playerId);
  const otherCursorColor = myIndex === 0 ? '#ff8a65' : '#4fc3f7';

  // ---- Piece border color ----
  const getBorderColor = (piece) => {
    if (piece.placed) return '#4caf50';
    if (piece.grabbedBy && piece.grabbedBy !== playerId) return '#ff8a65';
    return '#444';
  };

  const zoomPct = Math.round(stageScale * 100);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        draggable
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={warmUpAudio}
        onTouchStart={warmUpAudio}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Layer 1 — board background & ghost outlines */}
        <Layer listening={false}>
          <Rect
            x={boardX}
            y={boardY}
            width={imageWidth}
            height={imageHeight}
            fill="#151525"
            stroke="#333"
            strokeWidth={2}
            cornerRadius={4}
          />
          {pieces.map((p) => (
            <Rect
              key={`ghost-${p.id}`}
              x={p.correctX}
              y={p.correctY}
              width={p.width}
              height={p.height}
              stroke="#2a2a3a"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}
        </Layer>

        {/* Layer 2 — puzzle pieces */}
        <Layer>
          {sortedPieces.map((piece) => {
            const isDraggable =
              !piece.placed &&
              (piece.grabbedBy === null || piece.grabbedBy === playerId);
            const isDragging =
              piece.grabbedBy !== null && piece.grabbedBy === playerId;

            return (
              <Group
                key={piece.id}
                x={piece.currentX}
                y={piece.currentY}
                draggable={isDraggable}
                onDragStart={() => handleDragStart(piece.id)}
                onDragMove={(e) => handleDragMove(piece.id, e)}
                onDragEnd={(e) => handleDragEnd(piece.id, e)}
                shadowColor={isDragging ? '#000' : undefined}
                shadowBlur={isDragging ? 10 : 0}
                shadowOffsetX={isDragging ? 3 : 0}
                shadowOffsetY={isDragging ? 3 : 0}
                shadowOpacity={isDragging ? 0.5 : 0}
              >
                {image && (
                  <KonvaImage
                    image={image}
                    width={piece.width}
                    height={piece.height}
                    crop={{
                      x: piece.col * (image.width / cols),
                      y: piece.row * (image.height / rows),
                      width: image.width / cols,
                      height: image.height / rows,
                    }}
                  />
                )}
                <Rect
                  width={piece.width}
                  height={piece.height}
                  stroke={getBorderColor(piece)}
                  strokeWidth={piece.placed ? 2 : 1}
                />
                {piece.placed && (
                  <Rect
                    width={piece.width}
                    height={piece.height}
                    fill="rgba(76,175,80,0.08)"
                  />
                )}
                {piece.grabbedBy &&
                  piece.grabbedBy !== playerId && (
                    <Rect
                      width={piece.width}
                      height={piece.height}
                      fill="rgba(255,138,101,0.15)"
                    />
                  )}
              </Group>
            );
          })}
        </Layer>

        {/* Layer 3 — other player cursor */}
        <Layer listening={false}>
          {otherCursor && (
            <Group x={otherCursor.x} y={otherCursor.y}>
              <Circle
                radius={8}
                fill={otherCursorColor}
                opacity={0.7}
              />
              {otherPlayer && (
                <Text
                  text={otherPlayer.name}
                  fontSize={12}
                  fill="#fff"
                  y={12}
                  offsetX={0}
                />
              )}
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Reference image — bottom-left with toggle arrow */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 20, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        {showRefImage && imageUrl && (
          <div className="ref-image-container">
            <img src={imageUrl} alt="Reference" className="ref-image" />
          </div>
        )}
        <button
          className="zoom-btn ref-toggle-btn"
          onClick={() => setShowRefImage((v) => !v)}
          title={showRefImage ? 'Hide reference' : 'Show reference'}
        >
          {showRefImage ? '◀' : '▶'}
        </button>
      </div>

      {/* Zoom controls overlay */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20 }}>
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>+</button>
          <span className="zoom-label">{zoomPct}%</span>
          <button className="zoom-btn" onClick={zoomOut}>−</button>
          <button className="zoom-btn" onClick={zoomReset}>↺</button>
        </div>
      </div>
    </div>
  );
}
