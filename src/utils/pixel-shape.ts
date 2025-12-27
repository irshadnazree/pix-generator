import type { ShapeType } from '../constants/pixel-shape';

// Shape mask cache - stores computed masks to avoid recalculation
const maskCache = new Map<string, boolean[][]>();

/**
 * Returns a cached shape mask, computing it only if not already cached.
 * This significantly reduces CPU usage during hit-testing and rendering.
 */
export const getCachedMask = (
  shapeType: ShapeType,
  width: number,
  height: number
): boolean[][] => {
  const key = `${shapeType}-${width}-${height}`;
  
  const cached = maskCache.get(key);
  if (cached) return cached;
  
  const mask = createShapeMask(shapeType, width, height);
  maskCache.set(key, mask);
  return mask;
};

// Helper function to darken a HEX color and apply opacity
export const darkenColor = (hexColor: string, percent: number, alpha = 1): string => {
  if (!hexColor) return `rgba(0,0,0,${alpha})`;
  
  let hex = hexColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - percent)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - percent)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - percent)));

  return `rgba(${r},${g},${b},${alpha})`;
};

// Utility function to check if a point is inside an ellipse
export const isPointInEllipse = (
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): boolean => {
  if (radiusX <= 0 || radiusY <= 0) return false;
  
  const normalizedX = (px - centerX) / radiusX;
  const normalizedY = (py - centerY) / radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
};

// Shape mask generators
export const createShapeMask = (shapeType: ShapeType, width: number, height: number): boolean[][] => {
  if (width <= 0 || height <= 0) return [];

  const mask = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  switch (shapeType) {
    case "ellipse":
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (
            isPointInEllipse(
              x + 0.5,
              y + 0.5,
              centerX,
              centerY,
              radiusX,
              radiusY
            )
          ) {
            mask[y][x] = true;
          }
        }
      }
      break;

    case "crescent":
      const cutRadiusX = radiusX;
      const cutRadiusY = radiusY;
      const cutCenterX = centerX + radiusX * 0.5;
      const cutCenterY = centerY;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pointX = x + 0.5;
          const pointY = y + 0.5;
          const inMain = isPointInEllipse(
            pointX,
            pointY,
            centerX,
            centerY,
            radiusX,
            radiusY
          );
          const inCut = isPointInEllipse(
            pointX,
            pointY,
            cutCenterX,
            cutCenterY,
            cutRadiusX,
            cutRadiusY
          );
          if (inMain && !inCut) {
            mask[y][x] = true;
          }
        }
      }
      break;

    case "box":
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          mask[y][x] = true;
        }
      }
      break;
  }

  return mask;
};

// Check if pixel is on outline
export const isOutlinePixel = (
  x: number,
  y: number,
  mask: boolean[][],
  shapeType: ShapeType,
  width: number,
  height: number
): boolean => {
  if (shapeType === "box") {
    return x === 0 || x === width - 1 || y === 0 || y === height - 1;
  }

  // Check neighbors for ellipse and crescent
  for (let ny = Math.max(0, y - 1); ny <= Math.min(height - 1, y + 1); ny++) {
    for (let nx = Math.max(0, x - 1); nx <= Math.min(width - 1, x + 1); nx++) {
      if (nx === x && ny === y) continue;
      if (!mask[ny][nx]) return true;
    }
  }

  // Check bounding box edges
  if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
    return mask[y][x];
  }

  return false;
};

// Helper functions for touch distance calculation
export const getTouchDistance = (touches: React.TouchList | TouchList): number => {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getTouchCenter = (touches: React.TouchList | TouchList): { x: number; y: number } => {
  if (touches.length === 1) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  const x = (touches[0].clientX + touches[1].clientX) / 2;
  const y = (touches[0].clientY + touches[1].clientY) / 2;
  return { x, y };
}; 