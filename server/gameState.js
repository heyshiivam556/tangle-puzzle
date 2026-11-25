export function generatePuzzle(settings) {
  const { rows, cols, imageWidth, imageHeight } = settings;

  const pieceWidth = imageWidth / cols;
  const pieceHeight = imageHeight / rows;

  const worldWidth = imageWidth * 2.5;
  const worldHeight = imageHeight * 2.5;

  const boardX = (worldWidth - imageWidth) / 2;
  const boardY = (worldHeight - imageHeight) / 2;

  // Margin around the board where pieces should not spawn
  const margin = 20;
  const boardLeft = boardX - margin;
  const boardRight = boardX + imageWidth + margin;
  const boardTop = boardY - margin;
  const boardBottom = boardY + imageHeight + margin;

  const pieces = [];
  let id = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const correctX = boardX + col * pieceWidth;
      const correctY = boardY + row * pieceHeight;

      // Scatter piece randomly outside the board area
      let currentX, currentY;
      do {
        currentX = Math.random() * (worldWidth - pieceWidth);
        currentY = Math.random() * (worldHeight - pieceHeight);
      } while (
        currentX + pieceWidth > boardLeft &&
        currentX < boardRight &&
        currentY + pieceHeight > boardTop &&
        currentY < boardBottom
      );

      pieces.push({
        id,
        row,
        col,
        correctX,
        correctY,
        currentX,
        currentY,
        width: pieceWidth,
        height: pieceHeight,
        placed: false,
        placedBy: null,
        grabbedBy: null,
      });

      id++;
    }
  }

  return {
    pieces,
    worldWidth,
    worldHeight,
    boardX,
    boardY,
    imageWidth,
    imageHeight,
    rows,
    cols,
    startTime: Date.now(),
    placedCount: 0,
  };
}
