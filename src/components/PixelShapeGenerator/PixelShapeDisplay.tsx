import React, { useEffect, useMemo, useRef } from "react";

import type { ShapeData } from "../../constants/pixel-shape";
import {
  darkenColor,
  getCachedMask,
  isOutlinePixel,
} from "../../utils/pixel-shape";

interface PixelShapeDisplayProps {
  shapeData: ShapeData;
  zoom: number;
  isSelected: boolean;
}

/**
 * Renders shape pixels to a canvas for improved performance.
 * Canvas is drawn at 1x scale and CSS transform is used for zooming,
 * eliminating re-renders on zoom changes.
 */
const drawShapeToCanvas = (
  ctx: CanvasRenderingContext2D,
  shapeData: ShapeData
) => {
  const { type, width, height, baseColor, opacity } = shapeData;
  const mask = getCachedMask(type, width, height);
  const outlineColor = darkenColor(baseColor, 0.3, opacity);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) continue;

      const isOutline = isOutlinePixel(x, y, mask, type, width, height);

      if (isOutline) {
        ctx.fillStyle = outlineColor;
        ctx.fillRect(x, y, 1, 1);
      }
      // Non-outline pixels remain transparent (already cleared)
    }
  }
};

export const PixelShapeDisplay = React.memo<PixelShapeDisplayProps>(
  ({ shapeData, zoom, isSelected }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { width, height, position } = shapeData;

    // Memoize shape data to determine when to redraw
    // This excludes position since position is handled via CSS transform
    const shapeKey = useMemo(
      () =>
        `${shapeData.type}-${shapeData.width}-${shapeData.height}-${shapeData.baseColor}-${shapeData.opacity}`,
      [
        shapeData.type,
        shapeData.width,
        shapeData.height,
        shapeData.baseColor,
        shapeData.opacity,
      ]
    );

    // Draw to canvas only when shape properties change (not on zoom)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawShapeToCanvas(ctx, shapeData);
    }, [shapeKey, shapeData]);

    return (
      <div
        className={`absolute ${isSelected ? "ring-2 ring-indigo-500 z-10" : ""} pointer-events-none`}
        style={{
          // Position is handled via transform for better performance
          transform: `translate(${position.x * zoom}px, ${position.y * zoom}px) scale(${zoom})`,
          transformOrigin: "top left",
          // Use image-rendering for crisp pixel art
          imageRendering: "pixelated",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: "block",
            imageRendering: "pixelated",
          }}
        />
      </div>
    );
  }
);

PixelShapeDisplay.displayName = "PixelShapeDisplay";
